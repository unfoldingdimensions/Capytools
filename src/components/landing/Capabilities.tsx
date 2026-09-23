import Image from "next/image";
import { CAPABILITIES, CAPABILITIES_PLATE } from "@/lib/capytools/landing";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SectionRule } from "@/components/landing/SectionRule";
import { PromiseIcon } from "@/components/landing/icons";

/** II. Capabilities / Promises — the two promises every tool keeps, and how to check them. */
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
                      {/* The trailing space is invisible at a block's end but
                          kept in the text: without it a screen reader read
                          "Runs inyour tab". */}
                      {card.title.map((line, i) => (
                        <span key={line} style={{ display: "block" }}>
                          {line}
                          {i < card.title.length - 1 ? " " : null}
                        </span>
                      ))}
                    </h3>
                    <p>{card.copy}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <p className="lp-cap-check">
              <b>{CAPABILITIES.check.lead}</b> {CAPABILITIES.check.text}{" "}
              <a href={CAPABILITIES.check.link.href}>{CAPABILITIES.check.link.label}</a>.
            </p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
