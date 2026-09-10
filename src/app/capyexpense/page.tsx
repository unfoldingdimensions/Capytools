import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { CapyExpenseShowcase } from "@/components/tool/CapyExpenseShowcase";
import { EXPENSE_FAQ, EXPENSE_RESEARCH, EXPENSE_WHAT } from "@/lib/capytools/capyexpense-page";

export const metadata = {
  title: "CapyExpense — a local-first expense tracker for Windows and Linux",
  description:
    "A desktop expense dashboard that reads a spreadsheet you type into yourself. No account, no bank login, no cloud, no AI. Your file never leaves your machine.",
};

/**
 * The page a visitor lands on before the builds exist, so it has to do the
 * job the download would: say what the thing is, show why the manual approach
 * is the point rather than a shortcoming, and answer the questions a desktop
 * app raises before someone will run an unsigned binary.
 *
 * Four parts under the live demo — what it is, the research, the FAQ, the
 * status. The research claims and their citations are lifted from
 * docs/research/capyexpense/research-brief.md; they are the only external
 * links the tool pages carry, and they earn it by being checkable.
 */
export default function CapyExpensePage() {
  return (
    <ToolPageShell
      tool="CapyExpense"
      eyebrow="CapyExpense · tool no. 5"
      index="Nº 05 / 05"
      large
      entrance={false}
      headline={[
        { text: "You already have the data." },
        { text: "It just never talks back", em: true, dot: true },
      ]}
      lead="A desktop expense dashboard that reads a spreadsheet you type into yourself. No account, no bank login, no cloud, nothing uploaded."
    >
      <p className="mb-6 flex justify-center">
        <span className="rounded-full border border-[var(--clay)]/35 bg-[var(--clay)]/[0.08] px-3.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--lp-accent-ink)]">
          Coming soon · Windows &amp; Linux
        </span>
      </p>

      <CapyExpenseShowcase />

      {/* WHAT IT IS */}
      <section className="mt-20 w-full text-left">
        <span className="lp-label">01 · What it is</span>
        <h2 className="lp-display mt-5 text-3xl sm:text-4xl">
          A spreadsheet you own, <em>read by something that draws</em>
          <span className="lp-dot">.</span>
        </h2>
        <p className="lp-lead mt-5 max-w-[62ch]">
          You type rows into a workbook the app generates — twelve month sheets, a
          category list, nothing exotic. The dashboard reads that file and turns a
          year of it into five charts and four numbers. It never writes over your
          rows, and there is no import step, because the file was always yours.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {EXPENSE_WHAT.map((card) => (
            <div key={card.tag} className="lp-card">
              <div className="lp-card-num">
                {card.num}
                <span className="lp-card-tag">{card.tag}</span>
              </div>
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="lp-divider mt-16" aria-hidden="true" />

      {/* THE RESEARCH */}
      <section className="mt-16 w-full text-left">
        <span className="lp-label">02 · Why typing it out</span>
        <h2 className="lp-display mt-5 text-3xl sm:text-4xl">
          The manual part <em>is the feature</em>
          <span className="lp-dot">.</span>
        </h2>
        <p className="lp-lead mt-5 max-w-[62ch]">
          Every mainstream expense app opens by asking for your bank login. Skipping
          that is usually framed as a limitation. It reads better as the whole
          design — and the literature is on that side of it.
        </p>

        <ol className="mt-8 space-y-6">
          {EXPENSE_RESEARCH.map((item, i) => (
            <li key={item.claim} className="flex gap-5">
              <span className="lp-method-num shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <p className="text-[15px] leading-relaxed text-foreground">{item.claim}</p>
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {item.sources.map((source) => (
                    <a
                      key={source.href}
                      href={source.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary"
                    >
                      {source.label}
                    </a>
                  ))}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-8 max-w-[62ch] text-[13px] leading-relaxed text-muted-foreground">
          Thirty-six sources were checked before this tool was built; the ledger
          lives in the repository under{" "}
          <code className="font-mono text-[12px]">docs/research/capyexpense/</code>.
        </p>
      </section>

      <div className="lp-divider mt-16" aria-hidden="true" />

      {/* FAQ */}
      <section className="mt-16 w-full text-left">
        <span className="lp-label">03 · Questions</span>
        <h2 className="lp-display mt-5 text-3xl sm:text-4xl">
          The ones worth asking <em>before you run a binary</em>
          <span className="lp-dot">.</span>
        </h2>

        <div className="mt-8 divide-y divide-border border-y border-border">
          {EXPENSE_FAQ.map((entry) => (
            <details key={entry.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-foreground">
                {entry.q}
                <span
                  aria-hidden
                  className="shrink-0 text-lg leading-none text-muted-foreground transition-transform duration-300 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-muted-foreground">
                {entry.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <div className="lp-divider mt-16" aria-hidden="true" />

      {/* STATUS */}
      <section className="mt-16 w-full text-left">
        <span className="lp-label">04 · Status</span>
        <div className="mt-5 rounded-2xl border border-[var(--clay)]/25 bg-[var(--clay)]/[0.07] p-5">
          <p className="text-[15px] font-medium text-foreground">
            Not out yet — this is what it will look like.
          </p>
          <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted-foreground">
            Everything above is the real app running on sample data. The Windows and
            Linux builds are still being packaged, so there is nothing to download
            today. When they land they will be unsigned — a certificate costs more
            per year than this tool earns, which is nothing — so Windows will warn
            you, and every release will ship with a SHA-256 you can check first.
          </p>
        </div>
        <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          a desktop tool — stored on your machine, never ours. windows &amp; linux builds coming
          soon.
        </p>
      </section>
    </ToolPageShell>
  );
}
