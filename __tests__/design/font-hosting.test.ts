import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * The type system is self-hosted, and that is load-bearing rather than a
 * preference.
 *
 * These families used to come from `next/font/google`, which fetches from
 * fonts.googleapis.com and fonts.gstatic.com during the build. When that fetch
 * failed — as it did on CI, intermittently, with no code change — Next left the
 * `gstatic.com` URL in the generated stylesheet unrewritten and Turbopack then
 * died resolving it as a module:
 *
 *   Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
 *   next/font/google queries have exactly one entry
 *
 * The failure landed in the build step, after lint and tests had passed, and it
 * would have hit a deploy the same way. Vendoring the files removes the network
 * from the build entirely. This test is the tripwire that keeps it removed: a
 * reintroduced `next/font/google` import, or a font path that no longer exists,
 * fails here in a second instead of in a cold build on a bad day.
 */
const layout = readFileSync(path.join(process.cwd(), 'app', 'layout.tsx'), 'utf8');

/** Every source file that could pull in a font loader. */
function sourceFiles(): string[] {
  const roots = ['app', 'components', 'lib', 'hooks'];
  const out: string[] = [];
  for (const root of roots) {
    const dir = path.join(process.cwd(), root);
    if (!existsSync(dir)) continue;
    const walk = (d: string) => {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
      }
    };
    walk(dir);
  }
  return out;
}

describe('self-hosted fonts', () => {
  const files = sourceFiles();

  it('never imports a font from a CDN', () => {
    // Match an import statement, not prose: the comment in app/layout.tsx names
    // `next/font/google` on purpose, to record why it was removed. A bare substring
    // check would flag that explanation and force the comment out of the file.
    const importRe = /(?:from|import)\s*\(?\s*['"`]next\/font\/(google|local)\b/;
    const offenders = files
      .map((f) => ({ file: path.relative(process.cwd(), f), src: readFileSync(f, 'utf8') }))
      .filter(({ src }) =>
        [...src.matchAll(new RegExp(importRe, 'g'))].some((m) => m[1] === 'google')
      )
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it('loads every family through next/font/local', () => {
    expect(layout).toMatch(/from 'next\/font\/local'/);
    // One loader call per role: the three tokens the type system defines.
    expect(layout.match(/localFont\(/g)).toHaveLength(3);
    for (const variable of ['--font-sans', '--font-display', '--font-mono']) {
      expect(layout).toContain(variable);
    }
  });

  it('points every src at a file that exists on disk', () => {
    // The loader requires literal strings, so a renamed file can only be caught
    // by comparing the literal against the filesystem — which is this test.
    // The group is optional to the type checker, so narrow it rather than assert.
    const group = (re: RegExp) =>
      [...layout.matchAll(re)].map((m) => m[1]).filter((v): v is string => typeof v === 'string');
    const all = [...group(/src:\s*'([^']+\.woff2)'/g), ...group(/path:\s*'([^']+\.woff2)'/g)];

    expect(all.length).toBeGreaterThanOrEqual(4);
    for (const rel of all) {
      const abs = path.join(process.cwd(), rel.replace(/^\.\.\//, ''));
      expect({ rel, exists: existsSync(abs) }).toEqual({ rel, exists: true });
    }
  });

  it('commits real woff2 files under app/fonts', () => {
    const dir = path.join(process.cwd(), 'app', 'fonts');
    const fonts = readdirSync(dir).filter((f) => f.endsWith('.woff2'));
    expect(fonts.length).toBeGreaterThanOrEqual(4);

    // The woff2 signature is 'wOF2'. An LFS pointer, a truncated download or an
    // HTML error page saved as .woff2 all fail this.
    for (const name of fonts) {
      const bytes = readFileSync(path.join(dir, name)).subarray(0, 4).toString('latin1');
      expect({ name, signature: bytes }).toEqual({ name, signature: 'wOF2' });
    }
  });

  it('keeps the fonts out of public/, where they would bypass the loader', () => {
    // They are build inputs fingerprinted into /_next/static/media by the loader.
    // Leaving copies in public/ would ship each file twice.
    expect(existsSync(path.join(process.cwd(), 'public', 'fonts'))).toBe(false);
  });
});
