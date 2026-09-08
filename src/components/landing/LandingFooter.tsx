import { LANDING_FOOTER } from "@/lib/capytools/landing";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { TransitionLink } from "@/components/TransitionLink";

/**
 * The editorial footer: brand column, link columns, status row, and the
 * giant closing wordmark. Tool-page footers keep the shared SiteFooter.
 * Every link routes natively.
 */
export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-foot-grid">
          <div className="lp-foot-brand">
            <a href="#top" className="lp-brand" aria-label="Capytools — back to top">
              <span className="lp-brand-mark" aria-hidden="true">
                C
              </span>
              <span>Capytools</span>
            </a>
            <p>{LANDING_FOOTER.blurb}</p>
            <TransitionLink
              href={LANDING_FOOTER.getExpense.href}
              className="lp-foot-cta"
            >
              {LANDING_FOOTER.getExpense.label}
              <span className="lp-foot-cta-sub">{LANDING_FOOTER.getExpense.sub}</span>
            </TransitionLink>
          </div>

          {LANDING_FOOTER.columns.map((col) => (
            <nav className="lp-foot-col" key={col.title} aria-label={col.title}>
              <h5>{col.title}</h5>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <TransitionLink href={link.href}>{link.label}</TransitionLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="lp-foot-bottom">
          <span>
            <span className="lp-heart" aria-hidden="true">
              ●{" "}
            </span>
            {LANDING_FOOTER.status[0]}
          </span>
          <span>
            {LANDING_FOOTER.status[1]} ·{" "}
            <TransitionLink href="/notes">Notes</TransitionLink> ·{" "}
            <span className="lp-heart">{LANDING_FOOTER.status[2]}</span>
          </span>
        </div>

        <div className="lp-foot-mega">
          <ScrollReveal direction="rise-lg">
            <div className="lp-word">
              {LANDING_FOOTER.mega.map((seg, i) =>
                seg.em ? <em key={i}>{seg.text}</em> : <span key={i}>{seg.text}</span>,
              )}
              <span className="lp-dot">.</span>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </footer>
  );
}
