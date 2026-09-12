import "./landing.css";
import { Header } from "@/components/header";
import { Hero } from "@/components/landing/Hero";
import { LiveWire } from "@/components/landing/LiveWire";
import { About } from "@/components/landing/About";
import { Capabilities } from "@/components/landing/Capabilities";
import { Labs } from "@/components/landing/Labs";
import { Method } from "@/components/landing/Method";
import { SelectedWork } from "@/components/landing/SelectedWork";
import { Colophon } from "@/components/landing/Colophon";
import { ClosingCta } from "@/components/landing/ClosingCta";
import { LandingFooter } from "@/components/landing/LandingFooter";

/**
 * The editorial landing — assembled from the OpenDesign export, section for
 * section: cover plate, live wire, manifesto, promises, tool catalog, house
 * rules, the ink slab, the colophon, and the closing plate.
 *
 * The masthead is the shared `<Header>` — the landing only gives it section
 * anchors instead of the suite switcher, and points the brand at `#top` rather
 * than home. The landing keeps its own footer.
 */

/** In-page sections, in place of the tool switcher other pages get. */
const LANDING_LINKS = [
  { href: "#labs", label: "Suite" },
  { href: "#method", label: "Method" },
  { href: "#work", label: "Work" },
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
        cta={{ label: "Open the tools", href: "#labs" }}
        brandHref="#top"
      />

      <main id="main">
        <Hero />
        <LiveWire />
        {/* The manifesto band — one surface for the two reading sections,
            breaking the long cream run before the catalog. */}
        <div className="lp-band">
          <About />
          <Capabilities />
        </div>
        <Labs />
        <Method />
        <SelectedWork />
        <Colophon />
        <ClosingCta />
      </main>

      <LandingFooter />
    </div>
  );
}
