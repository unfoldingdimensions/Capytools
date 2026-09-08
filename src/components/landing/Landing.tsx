import "./landing.css";
import { LandingMasthead } from "@/components/landing/LandingMasthead";
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
 * rules, the ink slab, the colophon, and the closing plate. The tool pages
 * keep the shared Header/SiteFooter; the landing ships its own masthead and
 * footer.
 */
export function Landing() {
  return (
    <div className="lp">
      <a className="lp-skip-link" href="#main">
        Skip to content
      </a>

      <LandingMasthead />

      <main id="main">
        <Hero />
        <LiveWire />
        <About />
        <Capabilities />
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
