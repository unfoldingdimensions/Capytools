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
  // va.vercel-scripts.com is @vercel/analytics + @vercel/speed-insights. Report-only
  // mode caught this one on the first page load. If those two components are ever
  // dropped (see the privacy-copy question), this origin goes with them.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://avatars.githubusercontent.com",
  "font-src 'self' data:",
  // 'self' covers Vercel Analytics (/_vercel/insights); https: covers the
  // user-configured LLM provider.
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
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
