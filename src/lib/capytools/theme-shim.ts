/**
 * A three-word shim that keeps the theme from flashing.
 *
 * next-themes ships its anti-flash script by serialising a function into a
 * blocking inline <script>: `(${apply.toString()})(args)`. The Cloudflare
 * adapter bundles the server with esbuild's `keepNames`, which rewrites that
 * function's inner declarations to call an `__name` helper — and the helper is
 * not in scope inside a serialised string. The script threw
 * `__name is not defined` before it could read the stored theme, so every cold
 * load painted the default and then snapped to the real theme at hydration.
 * That is a Cloudflare-only regression: on Vercel the script was never
 * rewritten.
 *
 * Fixing it upstream is not available to us — the adapter exposes no esbuild
 * options, and marking next-themes external gives React two copies and breaks
 * the build. So: define the helper as an identity function before next-themes'
 * script runs. It is in <head>, so it runs before the provider's script in
 * <body>. Delete this the day the adapter stops setting `keepNames`.
 *
 * This is the only `dangerouslySetInnerHTML` in the app. The payload is this
 * constant and nothing else — no props, no params, no user input reaches it,
 * which is what `tests/security.test.ts` pins.
 */
export const NAME_SHIM = "window.__name=window.__name||function(f){return f};";
