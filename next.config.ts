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
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  isProd
    ? "connect-src 'self' https: http://localhost:* http://127.0.0.1:*"
    : "connect-src 'self' https: http: ws: wss:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

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
