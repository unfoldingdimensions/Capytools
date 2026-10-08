/**
 * @jest-environment node
 *
 * The Content-Security-Policy has two failure modes, and this project has now
 * paid for both: too loose, and too tight in a way that only a production build
 * in a real browser notices.
 *
 * The second one is not hypothetical. The PDF exporter's layout engine is
 * `yoga-layout`, the WebAssembly build @react-pdf/renderer instantiates at
 * runtime, and WebAssembly compilation is governed by `script-src`. A policy
 * without `'wasm-unsafe-eval'` breaks Download PDF in every production build,
 * while `npm run dev` (which carries `'unsafe-eval'`) and `npm run verify:pdf`
 * (which runs in Node, where no CSP applies) both stay green. These assertions
 * are what keep that from coming back.
 */
import nextConfig, { buildContentSecurityPolicy } from '@/next.config';

type HeaderGroup = { source: string; headers: Array<{ key: string; value: string }> };

const groups = (nextConfig.headers as unknown as () => HeaderGroup[])();

function headerValue(key: string): string {
  for (const group of groups) {
    const found = group.headers.find((header) => header.key.toLowerCase() === key.toLowerCase());
    if (found) return found.value;
  }
  throw new Error(`no ${key} header in next.config`);
}

const csp = headerValue('Content-Security-Policy');
const productionPolicy = buildContentSecurityPolicy(true);
const devPolicy = buildContentSecurityPolicy(false);

function directiveIn(policy: string, name: string): string {
  return (
    policy
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name} `)) ?? ''
  );
}

describe('the Content-Security-Policy', () => {
  it('is the policy that actually reaches the response headers', () => {
    expect(csp).toBe(buildContentSecurityPolicy(process.env.NODE_ENV === 'production'));
  });

  it('lets the PDF exporter compile its WebAssembly module', () => {
    // Without this token, Download PDF dies in production with
    // `CompileError: WebAssembly.instantiate(): ... violates the following
    // Content-Security policy directive`.
    expect(directiveIn(productionPolicy, 'script-src')).toContain("'wasm-unsafe-eval'");
    expect(directiveIn(devPolicy, 'script-src')).toContain("'wasm-unsafe-eval'");
  });

  it('lets yoga fetch its inlined WebAssembly from a data: URL', () => {
    // Refused, every PDF export logs a CSP violation before yoga falls back.
    expect(directiveIn(productionPolicy, 'connect-src')).toContain('data:');
    expect(directiveIn(devPolicy, 'connect-src')).toContain('data:');
  });

  it('never restores JS eval to a production policy', () => {
    expect(directiveIn(productionPolicy, 'script-src')).not.toContain("'unsafe-eval'");
    // Dev keeps it: the bundler and HMR socket need it.
    expect(directiveIn(devPolicy, 'script-src')).toContain("'unsafe-eval'");
  });

  it('keeps the directives that stop the exotic channels', () => {
    for (const policy of [productionPolicy, devPolicy]) {
      expect(directiveIn(policy, 'default-src')).toBe("default-src 'self'");
      expect(directiveIn(policy, 'object-src')).toBe("object-src 'none'");
      expect(directiveIn(policy, 'base-uri')).toBe("base-uri 'self'");
      expect(directiveIn(policy, 'frame-ancestors')).toBe("frame-ancestors 'none'");
      expect(directiveIn(policy, 'form-action')).toBe("form-action 'self'");
    }
  });

  it('keeps the BYOK contract: no cleartext remote host, local models still reachable', () => {
    const connect = directiveIn(productionPolicy, 'connect-src');
    expect(connect).toContain("'self'");
    expect(connect).toContain('https:');
    expect(connect).toContain('http://localhost:*');
    expect(connect).toContain('http://127.0.0.1:*');
    // `http:` as a bare scheme would let a key travel in the clear.
    expect(connect).not.toMatch(/(^|\s)http:(\s|$)/);
  });

  it('still ships the rest of the security headers', () => {
    expect(headerValue('X-Frame-Options')).toBe('DENY');
    expect(headerValue('X-Content-Type-Options')).toBe('nosniff');
    expect(headerValue('Strict-Transport-Security')).toContain('max-age=');
    expect(headerValue('Referrer-Policy')).toBeTruthy();
  });
});
