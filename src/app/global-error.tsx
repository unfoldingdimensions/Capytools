"use client";

/**
 * The last resort: the root layout itself threw.
 *
 * This REPLACES the layout, so there is no ThemeProvider, no font variables,
 * no globals.css guarantee and no Header — which is exactly why everything
 * here is inline and literal. Importing the design tokens would be reaching
 * for the thing that just failed.
 *
 * It is deliberately plainer than `error.tsx`. The only jobs are: say what
 * happened in one sentence, offer a way out, and still look like the site's
 * cream page rather than a browser default.
 *
 * The colours are the brand's own, hard-coded on purpose: `--brand-disc` and
 * friends live in tokens.css, which may be exactly what did not load.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9f9f7",
          color: "#141412",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: "46ch", textAlign: "center" }}>
          <div
            aria-hidden
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: "#8e9b7e",
              margin: "0 auto 28px",
            }}
          />
          <h1 style={{ fontSize: 28, fontWeight: 400, margin: "0 0 12px", lineHeight: 1.2 }}>
            Capytools could not load
          </h1>
          <p style={{ margin: "0 0 28px", lineHeight: 1.6, color: "#6b6a66" }}>
            Something failed before the page could start. Nothing you typed or
            dropped was sent anywhere — the tools only ever run in your browser.
          </p>
          <button
            onClick={reset}
            style={{
              font: "inherit",
              cursor: "pointer",
              border: "1px solid #141412",
              background: "#141412",
              color: "#f9f9f7",
              borderRadius: 999,
              padding: "10px 22px",
            }}
          >
            try again
          </button>
          <p style={{ marginTop: 24 }}>
            {/* A plain anchor on purpose. <Link /> navigates through the
                router, and the router is part of what just failed — a full
                page load is the only exit that does not depend on it. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ color: "#5f7a72" }}>
              or go back to the landing
            </a>
          </p>
          {error.digest ? (
            <p style={{ marginTop: 28, fontSize: 11, letterSpacing: "0.14em", color: "#9a9891" }}>
              REFERENCE {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
