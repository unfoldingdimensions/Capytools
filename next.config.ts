import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * The desktop app has had a tight CSP since day one (`tauri.conf.json`); the
 * website — the one holding people's LLM API keys in localStorage — had none.
 * These are the headers that carry no compatibility risk.
 */
const SECURITY_HEADERS = [
  // Nothing here is ever meant to be framed. Without this, any site can iframe
  // a tool page, overlay it, and harvest interaction with the API-key panel.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

/**
 * CSP, report-only for now.
 *
 * Deliberately not enforcing yet: `script-src` needs `unsafe-inline` until the
 * app moves to nonces, and promoting a policy that has never been observed is
 * how you take a site down on a Friday. Run it report-only, watch the console
 * for violations, then flip the header name to `Content-Security-Policy`.
 *
 * `connect-src` is the honest weak spot and cannot be tightened while the LLM
 * tools let people point at their own OpenAI-compatible endpoint — any https
 * origin is a legitimate destination. `https:` still rules out cleartext and
 * data:/blob: exfiltration. The real wins here are frame-ancestors, object-src
 * and base-uri, which cost nothing.
 */
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  // No third-party script origin at all. @vercel/analytics and
  // @vercel/speed-insights were the only ones, and they went with the move off
  // Vercel — so the privacy copy is now literally true rather than nearly true.
  // Anything added back here is a claim on /notes that has to change with it.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://avatars.githubusercontent.com",
  "font-src 'self' data:",
  // https: covers the user-configured LLM provider, which is the only reason
  // this cannot be tightened to 'self'.
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  /**
   * Dev only. Next 16 refuses its dev assets and HMR to any hostname but
   * localhost, so opening the dev server from a phone or another machine on
   * the LAN (http://192.168.x.y:3024) loaded the HTML and then never hydrated:
   * blurred headline, every reveal stuck at opacity 0, demos frozen on
   * "loading". Private 192.168/16 only — one `*` is one label — and it has
   * no effect on the production build.
   */
  allowedDevOrigins: ["192.168.*.*"],

  /**
   * No image optimizer. The plates are hand-optimized WebP at their display
   * size, so Cloudflare's IMAGES binding would re-encode already-final bytes
   * and bill for the privilege. Without this, the default loader would look
   * for an optimizer endpoint that does not exist on Workers.
   */
  images: { unoptimized: true },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...SECURITY_HEADERS,
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
        ],
      },
    ];
  },
};

export default nextConfig;
