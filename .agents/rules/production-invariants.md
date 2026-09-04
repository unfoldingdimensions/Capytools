# Capytools Production & Component Invariants

Whenever building or modifying components, routes, styles, or export cards in Capytools, adhere to the following invariants:

## 1. Satori & OG Social Card Generation
- **CSS Property Subset**: Satori supports only `display: "flex" | "block" | "contents" | "none" | "-webkit-box"`. Never use `display: "inline-block"`.
- **No Unicode Symbols in CardArt**: Never render Unicode glyphs/stars (e.g. `★`) as text in Satori templates. Always use an inline vector `<svg viewBox="..." fill="currentColor" style={{ display: "flex" }}>` to prevent dynamic font 400 download failures.
- **Font Weight Parity**: Ensure any font weight referenced in CardArt (e.g. `fontWeight: 500`) is explicitly fetched in the `googleFont(...)` loader in `route.tsx`.

## 2. Client Storage & SSR Hydration
- **No Direct Storage in State**: Never read `localStorage` or `sessionStorage` in `useState(() => readCache())` — this triggers React hydration mismatches.
- **useSyncExternalStore with Stable References**: Synchronize client-side storage using `useSyncExternalStore`.
- **Snapshot Referential Stability**: `getSnapshot` must return a referentially equal object (`Object.is(prev, next)`) if the underlying storage string has not changed. Always maintain an in-memory cache keyed by the raw storage string to prevent infinite loop errors.

## 3. Accessibility & Contrast
- **WCAG AA Primary Contrast**: In light mode, `--primary: #8e9b7e` requires dark ink text (`--primary-foreground: #141412`), never white (`#ffffff`).
- **Text Link Contrast**: Do not use `text-primary` as static text on white/cream backgrounds. Use `text-foreground transition-colors hover:text-primary`.
- **Combobox Names**: Every Radix `<SelectTrigger>` must include an explicit `aria-label` or `id` matching `<label htmlFor="...">`.
- **Spans with aria-label**: Any text reveal or decorative span carrying `aria-label` must explicitly specify `role="text"` to satisfy WCAG 4.1.2.
- **Switch Nesting**: Never wrap `<Switch>` inside an interactive `<label>`. Use sibling elements with `htmlFor` and `id`.

## 4. Layout & Sticky Header
- **Scroll Margin**: Any container targeted by `scrollIntoView` must include `scroll-mt-24` to prevent occlusion beneath the sticky header.
- **Copy Button Stability**: Always apply `min-w-[84px]` (or fixed width) to buttons that toggle between "Copy" and "Copied" to eliminate layout shift.
