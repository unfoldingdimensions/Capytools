import Image from "next/image";
import type { CSSProperties } from "react";
import { COLOPHON, TESTIMONIAL_PLATE } from "@/lib/capytools/landing";
import { gridColumns } from "@/lib/capytools/suite";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SectionRule } from "@/components/landing/SectionRule";
import { PartnerGlyph } from "@/components/landing/icons";
import { TransitionLink } from "@/components/TransitionLink";

/** VII. Colophon / First Line — the README's opening line, quoted verbatim. */export function Colophon() {
  return (
    <section className="lp-section lp-testimonial" id="testimonial">
      <div className="lp-container">
        <SectionRule roman={COLOPHON.roman} meta={COLOPHON.meta} />

        <div className="lp-testimonial-grid">
          <ScrollReveal className="lp-testimonial-copy">
            <span className="lp-label">
              {COLOPHON.label} <span className="lp-ix">{COLOPHON.ix}</span>
            </span>
            <h2>
              {COLOPHON.quote.map((seg, i) =>
                seg.em ? <em key={i}>{seg.text}</em> : <span key={i}>{seg.text}</span>,
              )}
            </h2>

            <div className="lp-author">
              <span className="lp-author-avatar" aria-hidden="true">
                {COLOPHON.author.initial}
              </span>
              <p>
                {COLOPHON.author.name}
                <span>{COLOPHON.author.sub}</span>
              </p>
            </div>

            <div className="lp-divider" aria-hidden="true" />
            <p className="lp-partners-lead">{COLOPHON.partnersLead}</p>

            <div
              className="lp-partners"
              style={
                { "--lp-partner-cols": gridColumns(COLOPHON.partners.length) } as CSSProperties
              }
            >
              {COLOPHON.partners.map((partner, i) => (
                <ScrollReveal key={partner.name} delay={i * 0.07}>
                  <TransitionLink href={partner.href} className="lp-partner">
                    <span className="lp-glyph" aria-hidden="true">
                      <PartnerGlyph name={partner.name} />
                    </span>
                    <span>{partner.name}</span>
                    <small>{partner.small}</small>
                  </TransitionLink>
                </ScrollReveal>
              ))}
            </div>

            <TransitionLink className="lp-read-more" href={COLOPHON.readMore.href}>
              {COLOPHON.readMore.label}
            </TransitionLink>
          </ScrollReveal>

          <ScrollReveal className="lp-testimonial-art" direction="right">
            <div className="lp-plate">
              <Image
                src={TESTIMONIAL_PLATE.src}
                alt=""
                aria-hidden="true"
                width={TESTIMONIAL_PLATE.width}
                height={TESTIMONIAL_PLATE.height}
                sizes="(max-width: 880px) 100vw, 40vw"
              />
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
