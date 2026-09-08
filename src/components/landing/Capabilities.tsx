import Image from "next/image";
import { CAPABILITIES, CAPABILITIES_PLATE } from "@/lib/capytools/landing";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SectionRule } from "@/components/landing/SectionRule";
import { ArrowUpRight, PromiseIcon } from "@/components/landing/icons";
import { TransitionLink } from "@/components/TransitionLink";

/** III. Capabilities / Promises — the four promises every tool holds. */
export function Capabilities() {
  return (
    <section className="lp-section lp-capabilities" id="capabilities">
      <div className="lp-container">
        <SectionRule roman={CAPABILITIES.roman} meta={CAPABILITIES.meta} />

        <div className="lp-capabilities-grid">
          <ScrollReveal className="lp-capabilities-art" direction="left">
            <div className="lp-plate">
              <span className="lp-corner lp-corner-tl" aria-hidden="true" />
              <span className="lp-corner lp-corner-br" aria-hidden="true" />
              <Image
                src={CAPABILITIES_PLATE.src}
                alt=""
                aria-hidden="true"
                width={CAPABILITIES_PLATE.width}
                height={CAPABILITIES_PLATE.height}
                sizes="(max-width: 880px) 100vw, 46vw"
              />
              <div className="lp-ribbon">{CAPABILITIES.ribbon}</div>
            </div>
          </ScrollReveal>

          <ScrollReveal className="lp-capabilities-copy">
            <span className="lp-label">
              {CAPABILITIES.label} <span className="lp-ix">{CAPABILITIES.ix}</span>
            </span>
            <h2>
              {CAPABILITIES.headline.map((seg, i) =>
                seg.em ? <em key={i}>{seg.text}</em> : <span key={i}>{seg.text}</span>,
              )}
              <span className="lp-dot">.</span>
            </h2>
            <p className="lp-lead">{CAPABILITIES.lead}</p>

            <div className="lp-cards">
              {CAPABILITIES.cards.map((card, i) => (
                <ScrollReveal key={card.num} delay={i * 0.09}>
                  <div className="lp-card">
                    <div className="lp-card-num">
                      {card.num}
                      <span className="lp-card-tag">{card.tag}</span>
                    </div>
                    <PromiseIcon icon={card.icon} />
                    <h3>
                      {card.title.map((line) => (
                        <span key={line} style={{ display: "block" }}>
                          {line}
                        </span>
                      ))}
                    </h3>
                    <p>{card.copy}</p>
                    <TransitionLink
                      href={card.href}
                      className="lp-arrow-mark"
                      aria-label={`Learn more about ${card.tag}`}
                    >
                      <ArrowUpRight />
                    </TransitionLink>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
