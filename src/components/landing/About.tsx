import { ABOUT } from "@/lib/capytools/landing";
import { CapyOnsen } from "@/components/CapyOnsen";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SectionRule } from "@/components/landing/SectionRule";
import { ArrowUpRight } from "@/components/landing/icons";

/**
 * II. About / Manifesto. The export's about.png plate slot is the resident
 * capybara instead — the CapyOnsen loop literally illustrating the headline.
 */
export function About() {
  return (
    <section className="lp-section lp-about" id="about">
      <div className="lp-container">
        <SectionRule roman={ABOUT.roman} meta={ABOUT.meta} />

        <div className="lp-about-grid">
          <ScrollReveal className="lp-about-copy">
            <span className="lp-label">
              {ABOUT.label} <span className="lp-ix">{ABOUT.ix}</span>
            </span>
            <h2>
              {ABOUT.headline.map((seg, i) =>
                seg.em ? <em key={i}>{seg.text}</em> : <span key={i}>{seg.text}</span>,
              )}
              <span className="lp-dot">.</span>
            </h2>
            <p className="lp-lead">{ABOUT.lead}</p>
            <a className="lp-btn lp-btn-ghost" href={ABOUT.cta.href} target="_blank" rel="noreferrer noopener">
              {ABOUT.cta.label}
              <ArrowUpRight />
            </a>
            <p className="lp-about-side-note">{ABOUT.sideNote}</p>
            <div className="lp-about-foot">
              <span className="lp-about-mark" aria-hidden="true">
                C
              </span>
              <span>{ABOUT.footer}</span>
            </div>
          </ScrollReveal>

          <ScrollReveal className="lp-about-art" direction="right">
            <div className="lp-onsen">
              <CapyOnsen />
            </div>
            <p className="lp-about-caption">
              {ABOUT.caption[0]}
              <span>{ABOUT.caption[1]}</span>
            </p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
