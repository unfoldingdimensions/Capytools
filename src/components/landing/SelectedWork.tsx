import Image from "next/image";
import { WORK } from "@/lib/capytools/landing";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { TransitionLink } from "@/components/TransitionLink";

/**
 * VI. Selected Tools — the ink slab. The slab paints itself with
 * var(--foreground), so it reads ink-on-paper in light mode and paper-on-ink
 * in dark mode, entirely through the house tokens.
 */
export function SelectedWork() {
  return (
    <section className="lp-work-outer" id="work">
      <div className="lp-work">
        <div className="lp-work-rule lp-sec-rule">
          <span className="lp-roman">{WORK.roman}</span>
          <span className="lp-meta-grp">
            <span>{WORK.meta[0]}</span>
            <span aria-hidden="true">•</span>
            <span>{WORK.meta[1]}</span>
          </span>
          <span aria-hidden="true" />
        </div>

        <div className="lp-work-grid">
          <ScrollReveal className="lp-work-copy">
            <span className="lp-label">Selected tools</span>
            <h2>
              {WORK.headline.map((seg, i) =>
                seg.em ? <em key={i}>{seg.text}</em> : <span key={i}>{seg.text}</span>,
              )}
              <span className="lp-dot">.</span>
            </h2>
            <a className="lp-work-link" href={WORK.link.href}>
              {WORK.link.label}
            </a>
          </ScrollReveal>

          {WORK.cards.map((card) => (
            <ScrollReveal key={card.name}>
              <TransitionLink href={card.href} className="lp-work-card">
                <div className="lp-label-row">
                  <span>{card.kicker}</span>
                  <span>{card.index}</span>
                </div>
                <h3>{card.name}</h3>
                <p>{card.copy}</p>
                <div className="lp-plate">
                  <Image
                    src={card.plate.src}
                    alt=""
                    aria-hidden="true"
                    width={card.plate.width}
                    height={card.plate.height}
                    sizes="(max-width: 880px) 100vw, 34vw"
                  />
                </div>
                <div className="lp-meta-row">
                  <span>{card.meta[0]}</span>
                  <span>{card.meta[1]}</span>
                </div>
              </TransitionLink>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
