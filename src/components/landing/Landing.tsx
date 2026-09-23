import "./landing.css";
import { Header } from "@/components/header";
import { Hero } from "@/components/landing/Hero";
import { LiveWire } from "@/components/landing/LiveWire";
import { Capabilities } from "@/components/landing/Capabilities";
import { Labs } from "@/components/landing/Labs";
import { Method } from "@/components/landing/Method";
import { Colophon } from "@/components/landing/Colophon";
import { ClosingCta } from "@/components/landing/ClosingCta";
import { LandingFooter } from "@/components/landing/LandingFooter";

/**
 * The editorial landing — assembled from the OpenDesign export, section for
 * section: cover plate, the proof band, live wire, promises, tool catalog,
 * house rules, the colophon, and the closing plate. The proof band lives in
 * the hero's right column (Hero.tsx). The manifesto and the
 * "Selected Tools" slab were cut: one restated the promises, the other
 * repeated two catalog cards — a 26-screen phone page listed the suite four
 * times.
 *
 * The masthead is the shared `<Header>` — the landing only gives it section
 * anchors instead of the suite switcher, and points the brand at `#top` rather
 * than home. The landing keeps its own footer.
 */

/** In-page sections, in place of the tool switcher other pages get. */
const LANDING_LINKS = [
  { href: "/tools", label: "All Tools" },
  { href: "#proof", label: "Try it" },
  { href: "#method", label: "House rules" },
  { href: "/notes", label: "Notes" },
];

export function Landing() {
  return (
    <div className="lp">
      <a className="lp-skip-link" href="#main">
        Skip to content
      </a>

      <Header
        links={LANDING_LINKS}
        brandHref="#top"
      />

      <main id="main">
        <Hero />
        <LiveWire />
        {/* One card-coloured band breaks the long cream run before the catalog. */}
        <div className="lp-band">
          <Capabilities />
        </div>
        <Labs />
        <Method />
        <Colophon />
        <ClosingCta />
      </main>

      <LandingFooter />
    </div>
  );
}
