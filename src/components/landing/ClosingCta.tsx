import Image from "next/image";
import { CTA } from "@/lib/capytools/landing";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SectionRule } from "@/components/landing/SectionRule";
import { ArrowUpRight } from "@/components/landing/icons";

/** VIII. Closing plate. */
export function ClosingCta() {
  return (
    <section className="lp-section lp-cta" id="cta">
      <div className="lp-container">
        <SectionRule roman={CTA.roman} meta={CTA.meta} />

        <div className="lp-cta-grid">
          <ScrollReveal>
            <span className="lp-label">
              {CTA.label} <span className="lp-ix">{CTA.ix}</span>
            </span>
            <h2>
              {CTA.headline.map((seg, i) =>
                seg.em ? <em key={i}>{seg.text}</em> : <span key={i}>{seg.text}</span>,
              )}
              <span className="lp-dot">.</span>
            </h2>
            <p className="lp-lead">{CTA.lead}</p>

            <div className="lp-cta-actions">
              <a className="lp-btn lp-btn-primary" href={CTA.primary.href}>
                {CTA.primary.label}
                <ArrowUpRight />
              </a>
              <a className="lp-email-pill" href={CTA.secondary.href} target="_blank" rel="noreferrer noopener">
                {CTA.secondary.label}
                <span className="lp-arrow-circle" aria-hidden="true">
                  →
                </span>
              </a>
            </div>

            <div className="lp-cta-foot">
              <span className="lp-cta-stamp">{CTA.foot[0]}</span>
              <span>{CTA.foot[1]}</span>
            </div>
          </ScrollReveal>

          <ScrollReveal className="lp-cta-art" direction="right">
            <div className="lp-plate">
              <Image
                src={CTA.plate.src}
                alt=""
                aria-hidden="true"
                width={CTA.plate.width}
                height={CTA.plate.height}
                sizes="(max-width: 880px) 100vw, 46vw"
              />
            </div>
            <div className="lp-ribbon">{CTA.ribbon}</div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
