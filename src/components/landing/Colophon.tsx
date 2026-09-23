import Image from "next/image";
import { COLOPHON, TESTIMONIAL_PLATE } from "@/lib/capytools/landing";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SectionRule } from "@/components/landing/SectionRule";
import { TransitionLink } from "@/components/TransitionLink";

/**
 * VII. Colophon / First Line — the README's opening line, quoted verbatim.
 *
 * It used to end in a grid of eleven tool glyphs: the suite's SIXTH listing
 * on this page, after the hero lead, the live wire, the catalog, Selected
 * Work and the footer. /tools is the index now; the quote says the rest.
 */
export function Colophon() {
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
