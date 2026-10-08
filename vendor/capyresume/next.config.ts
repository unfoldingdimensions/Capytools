import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Content-Security-Policy, assembled once so the reasoning lives with it.
 *
 * `connect-src` is deliberately **not** an allowlist of the three known AI
 * providers. The BYOK client lets a user point at any OpenAI-compatible
 * endpoint — OpenRouter, LM Studio, a local Ollama — and a fixed allowlist
 * would break that the moment the config shipped. What this policy actually
 * guarantees is narrower and worth having: no request ever leaves for a remote
 * host over cleartext `http:`, so an API key cannot be sent in the clear, and
 * no exotic scheme can be used as a channel. Localhost stays open for local
 * models, and dev is permissive so the HMR socket and the bundler keep working.
 *
 * `script-src` and `style-src` need `'unsafe-inline'`: Next's App Router
 * streams its own inline bootstrap and flight data, and React sets style
 * attributes directly. `'unsafe-eval'` is dev-only.
 *
 * `'wasm-unsafe-eval'` is not optional, and its absence is invisible until a
 * production build meets a real browser. The PDF exporter's layout engine is
 * `yoga-layout` — the WebAssembly build @react-pdf/renderer instantiates at
 * runtime — and WebAssembly compilation is governed by `script-src`. Without
 * the token, Download PDF fails with `CompileError: WebAssembly.instantiate():
 * ... violates the following Content-Security policy directive` while
 * `npm run dev` (which carries `'unsafe-eval'`) and `npm run verify:pdf` (which
 * runs in Node, where no CSP applies) both stay green. It permits exactly WASM
 * compilation and still forbids JS `eval`, which is why it is preferred over
 * restoring `'unsafe-eval'` in production.
 */
/**
 * Exported so the guard tests can assert both branches. This file is evaluated
 * once, with the ambient `NODE_ENV`, so a test run otherwise never sees the
 * production policy — which is precisely how a WASM-hostile `script-src`
 * reached a production build with every check green.
 */
export function buildContentSecurityPolicy(isProduction: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isProduction ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // `data:` because yoga fetches its own inlined WebAssembly from a data: URL; refused,
    // it logs a CSP error on every PDF export and falls back. A data: URL is bytes
    // already in the page, so allowing it opens no channel out.
    isProduction
      ? "connect-src 'self' data: https: http://localhost:* http://127.0.0.1:*"
      : "connect-src 'self' data: https: http: ws: wss:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

const contentSecurityPolicy = buildContentSecurityPolicy(isProd);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: false, // Disabled until all routes are created
  compress: true, // Enable gzip/brotli compression

  experimental: {
    // Tree-shake heavy libraries for smaller bundles
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tooltip',
      'framer-motion',
    ],
  },

  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Security headers
  headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      // Cache static assets immutably
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
