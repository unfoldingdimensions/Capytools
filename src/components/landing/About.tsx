import Image from "next/image";
import { ABOUT } from "@/lib/capytools/landing";
import { BrandMark } from "@/components/brand-mark";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SectionRule } from "@/components/landing/SectionRule";
import { ArrowUpRight } from "@/components/landing/icons";
import { TransitionLink } from "@/components/TransitionLink";

/** II. About / Manifesto — the museum-vitrine plate beside the headline. */
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
            <TransitionLink className="lp-btn lp-btn-ghost" href={ABOUT.cta.href}>
              {ABOUT.cta.label}
              <ArrowUpRight />
            </TransitionLink>
            <div className="lp-about-foot">
              <BrandMark className="lp-about-mark" />
              <span>{ABOUT.footer}</span>
            </div>
          </ScrollReveal>

          <ScrollReveal className="lp-about-art" direction="right">
            <div className="lp-plate">
              <span className="lp-corner lp-corner-tl" aria-hidden="true" />
              <span className="lp-corner lp-corner-br" aria-hidden="true" />
              <Image
                src={ABOUT.plate.src}
                alt=""
                aria-hidden="true"
                width={ABOUT.plate.width}
                height={ABOUT.plate.height}
                sizes="(max-width: 880px) 100vw, 46vw"
              />
            </div>
            <p className="lp-about-side-note">{ABOUT.sideNote}</p>
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
