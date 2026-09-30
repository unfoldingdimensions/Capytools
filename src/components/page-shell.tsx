import { AmbientBackground } from "@/components/AmbientBackground";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
// The whole editorial stylesheet, on every page — deliberately. Turbopack emits
// it into the same shared CSS chunk the landing already loads (~5KB gzipped of
// it), so a visitor arriving from the landing pays nothing, and splitting it per
// route would trade that cache hit for a second request. This module carries the
// import so a page cannot forget it — /u/[username] did.
import "@/components/landing/landing.css";

/**
 * The site chrome, in one place.
 *
 * Every non-landing page needs the same seven-element opener, in the same order:
 * the `lp` wrapper, a skip-link to `#main`, the ambient layer, the Header,
 * `<main id="main">`, the content, and the footer. Eight files used to restate it
 * by hand and carry its three layering invariants in prose comments, which is how
 * /u/[username] came to ship without the skip-link, without the ambient layer and
 * without the `lp` class.
 *
 * The landing keeps its own chrome (decisions.md D7) — its Header takes section
 * anchors and its footer is LandingFooter — so this module serves the rest.
 *
 * tests/page-chrome.test.ts asserts the two structural invariants: the
 * `min-h-dvh` frame and the skip-link exist in exactly two files, this one and
 * the landing's, so a ninth hand-rolled copy fails the suite.
 *
 * No "use client": error.tsx is a client boundary and imports this, and a module
 * with no directive compiles into whichever bundle needs it. SiteFooter has been
 * imported from that same boundary since before this module existed.
 */

/** The three shapes a page's content area takes. */
type Layout = "page" | "card" | "editorial";

type Width = "3xl" | "4xl" | "5xl";

const WIDTH: Record<Width, string> = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
};

/**
 * Assembled as strings rather than combined with `cn()` on purpose:
 * tailwind-merge reorders conflicting utilities, and these have to come out
 * byte-identical to the copies they replace, so the migration is provably
 * behaviour-preserving. `page` and `card` keep the copies' original class order
 * for the same reason.
 */
const MAIN: Record<Layout, (width: string) => string> = {
  /** The six meta pages: a display headline, then the content. */
  page: (width) => `mx-auto w-full ${width} flex-1 px-6 pb-24 pt-16`,
  /** The share page: the card is the whole page, so it sits tight under the nav. */
  card: (width) => `mx-auto flex w-full ${width} flex-1 flex-col items-center px-6 pb-20 pt-5`,
  /** ToolPageShell composes its own sections, each at its own width. */
  editorial: () => "flex w-full flex-1 flex-col",
};

export function PageShell({
  tool,
  width = "3xl",
  layout = "page",
  footerHere,
  children,
}: {
  /** Names the current tool beside the wordmark; omit it where there is none. */
  tool?: string;
  width?: Width;
  layout?: Layout;
  /** Marks the footer link to the page you are on, which is not a way out. */
  footerHere?: "/tools" | "/notes";
  children: React.ReactNode;
}) {
  return (
    <div className="lp flex min-h-dvh flex-col text-foreground">
      <a className="lp-skip-link" href="#main">
        Skip to content
      </a>

      <AmbientBackground />
      <Header tool={tool} />

      <main id="main" className={MAIN[layout](WIDTH[width])}>
        {children}
      </main>

      {/* `wide` is a consequence of the page's width, not a second fact to keep
          in step: it exists so the footer's left edge lines up with a max-w-5xl
          page. Deriving it here retires the comment that used to state the rule. */}
      <SiteFooter here={footerHere} wide={width === "5xl"} />
    </div>
  );
}
