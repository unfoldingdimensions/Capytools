import Image from "next/image";
import { METHOD } from "@/lib/capytools/landing";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { SectionRule } from "@/components/landing/SectionRule";

/** V. Method / House Rules — arrive, compute, forget, keep. */
export function Method() {
  return (
    <section className="lp-section lp-method" id="method">
      <div className="lp-container">
        <SectionRule roman={METHOD.roman} meta={METHOD.meta} />

        <div className="lp-method-head">
          <ScrollReveal>
            <span className="lp-label">
              {METHOD.label} <span className="lp-ix">{METHOD.ix}</span>
            </span>
            <h2>
              {METHOD.headline.map((seg, i) =>
                seg.em ? <em key={i}>{seg.text}</em> : <span key={i}>{seg.text}</span>,
              )}
              <span className="lp-dot">.</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal className="lp-method-aside" direction="right">
            <span className="lp-plus" aria-hidden="true">
              +
            </span>
            <p>{METHOD.aside}</p>
          </ScrollReveal>
        </div>

        <div className="lp-method-grid">
          {METHOD.steps.map((step, i) => (
            <ScrollReveal key={step.num} delay={i * 0.11}>
              <div className="lp-method-step">
                <span className="lp-method-num">{step.num}</span>
                <h4>
                  {step.title}
                  {step.arrow && (
                    <span className="lp-arrow-r" aria-hidden="true">
                      →
                    </span>
                  )}
                </h4>
                <p>{step.copy}</p>
                <div className="lp-plate">
                  <Image
                    src={step.plate.src}
                    alt=""
                    aria-hidden="true"
                    width={step.plate.width}
                    height={step.plate.height}
                    sizes="(max-width: 880px) 50vw, 22vw"
                  />
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <div className="lp-method-foot">
          <div className="lp-method-foot-left">
            <span className="lp-ring" aria-hidden="true" />
            <span>{METHOD.foot}</span>
          </div>
          <div className="lp-method-foot-right">
            <a href="#top">capytools</a> · MIT
          </div>
        </div>
      </div>
    </section>
  );
}
