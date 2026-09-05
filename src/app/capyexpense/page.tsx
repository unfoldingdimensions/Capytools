import { AmbientBackground } from "@/components/AmbientBackground";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { CapyExpenseShowcase } from "@/components/tool/CapyExpenseShowcase";
import {
  PRIVACY_EVIDENCE,
  TRACKING_EVIDENCE,
  type Evidence,
} from "@/components/tool/capyexpense-evidence";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";

export const metadata = {
  title: "CapyExpense — a local-first expense tracker for Windows and Linux",
  description:
    "A desktop expense dashboard that reads a spreadsheet you type into yourself. No account, no bank login, no cloud, no AI. Your file never leaves your machine.",
};

const FAQ = [
  {
    q: "Does it read my bank?",
    a: "No. There is no bank connection in it, and no way to add one. You type rows into a spreadsheet and CapyExpense reads that file.",
  },
  {
    q: "What if I already have a spreadsheet?",
    a: "Paste your columns in. The headers are the whole format — Date, Category, Type, Amount — and they are matched by name, so the order does not matter. A CSV works too.",
  },
  {
    q: "Can I edit past years?",
    a: "Yes. One workbook per year, and every workbook in the folder is loaded together, so any date range works across as many years as you have.",
  },
  {
    q: "What happens on 1 January?",
    a: "You are offered a fresh workbook. Last year’s stays exactly where it is.",
  },
  {
    q: "Will an old file still open after an update?",
    a: "Yes, and that is a rule rather than a hope. Columns are only ever added to the right, never renamed or removed; columns CapyExpense does not recognise are kept untouched; and a file written by a newer version still opens. Reading never writes to your workbook.",
  },
  {
    q: "Is there a Mac build?",
    a: "Not yet. Gatekeeper blocks unsigned apps outright rather than warning about them, so a Mac build needs a paid Apple account before it is worth shipping.",
  },
  {
    q: "What does it cost?",
    a: "Nothing, and there is nothing to upsell. That is also why the installer is unsigned — see the note above.",
  },
];

export default function CapyExpensePage() {
  return (
    <div className="flex min-h-dvh flex-col text-foreground">
      <AmbientBackground />
      <Header tool="CapyExpense" />

      <main className="flex w-full flex-1 flex-col items-center px-6 pb-24">
        {/* Hero. The only entrance animation on the page: the chart draws itself. */}
        <section className="mx-auto flex w-full max-w-4xl flex-col items-center pt-8 text-center sm:pt-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            CapyExpense · tool no. 5
          </p>
          {/*
            The two sentences are a call and a response, so they get a line
            each. Run together they wrap mid-thought — "data. It just never
            talks" lands on one line and the punchline breaks across two.
          */}
          <h1 className="mt-6 font-display text-[2.6rem] font-light leading-[1.06] tracking-[-0.02em] text-balance text-foreground sm:text-[3.75rem]">
            <span className="block">
              <TextReveal text="You already have the data." delay={0.1} />
            </span>
            <em className="mt-1 block italic text-muted-foreground">
              <TextReveal text="It just never talks back." delay={0.32} />
            </em>
          </h1>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
              A desktop expense dashboard that reads a spreadsheet you type into yourself. No
              account, no bank login, no cloud, nothing uploaded.
            </p>
          </Reveal>
        </section>

        <section className="mx-auto mt-14 w-full max-w-5xl">
          <CapyExpenseShowcase />
        </section>

        <div className="mx-auto w-full max-w-4xl">
          <Band
            title="How it works"
            lede="Three steps, and then the same three forever."
          >
            <ol className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-3">
              {[
                [
                  "Type",
                  "CapyExpense creates one .xlsx a year and then never writes over your rows. You add a line when you spend something.",
                ],
                [
                  "Save",
                  "Nothing to sync and nothing to wait for. The app watches the file and notices the moment Excel puts it down.",
                ],
                [
                  "Read",
                  "Five charts and four numbers, every one of them drawn from the rows you typed and nothing else.",
                ],
              ].map(([title, body], i) => (
                <li key={title} className="border-t border-border pt-4">
                  <span className="font-mono text-[11px] tabular-nums text-[var(--sage-deep)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 font-display text-xl font-light text-foreground">{title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
          </Band>

          <Band
            title="Why bother tracking at all"
            lede="Because the gap between what people think they spend and what they spend is not small."
          >
            <div className="mt-8 max-w-[68ch] space-y-5 text-[17px] leading-[1.7] text-muted-foreground">
              <p>
                People who record their expenses spend measurably less. Financial self-control
                strategies — expense self-monitoring among them — carry a medium effect across
                twenty-nine studies. Writing an amount down makes it real in a way an automatic bank
                feed does not: the act of rehearsing a payment is what makes it stick.
              </p>
              <p>
                And the gap is large. People underestimate their upcoming spending by about half,
                and the expenses they miss are precisely the discretionary ones. Simply unpacking
                spending category by category raised remembered expenses by 36–60%, which is why the
                category column is not decoration. It is the intervention.
              </p>
              <p className="text-foreground">
                Subscriptions are the sharpest version of the same blind spot. Asked to estimate,
                people say $86 a month. Itemised, the real figure is $219 — a gap of $133 a month,
                or roughly $1,600 a year.
              </p>
              <p>
                Small recurring charges escape re-evaluation by design, which is why this dashboard
                annualises them and puts the number in front of you.
              </p>
            </div>
            <EvidenceCards sources={TRACKING_EVIDENCE} />
          </Band>

          <Band
            title="Why it stays on your machine"
            lede="Every other expense app has to send your transactions somewhere first."
          >
            <div className="mt-8 max-w-[68ch] space-y-5 text-[17px] leading-[1.7] text-muted-foreground">
              <p>
                YNAB stores in the US and shares with MX and Plaid. Monarch shares via Plaid,
                Finicity, MX and Spinwheel. Rocket Money markets “never sell your data” while its
                own policy admits sharing “in exchange for valuable consideration”.
              </p>
              <p>
                The aggregators behind them have a record. Plaid paid $58m to settle a class action
                over harvesting bank credentials; lawmakers asked the FTC to investigate Yodlee for
                selling transaction data to institutional investors; the budgeting app Dave leaked
                7.5 million user records.
              </p>
              <p className="border-l-2 border-[var(--water)] pl-5 text-foreground">
                CapyExpense has no network code in it. Not “we don’t upload” — there is no upload
                path to audit. Your year is one .xlsx on your disk, in a format you will still be
                able to open in 2040 whether or not this project exists.
              </p>
              <p>
                The dashboard above is the same code the app runs, on invented numbers. Nothing on
                this page phones home either.
              </p>
            </div>
            <EvidenceCards sources={PRIVACY_EVIDENCE} />
          </Band>

          <Band title="Get it" lede="Free, unsigned, and honest about what that means.">
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full bg-primary/50 px-6 py-3 text-sm font-medium text-[var(--primary-foreground)]/70">
                Windows — coming soon
              </span>
              <span className="rounded-full border border-border px-6 py-3 text-sm font-medium text-muted-foreground">
                Linux — coming soon
              </span>
            </div>

            <div className="mt-6 max-w-[68ch] rounded-2xl border border-[var(--clay)]/25 bg-[var(--clay)]/[0.07] p-5">
              <h3 className="text-[15px] font-medium text-foreground">
                Windows will warn you about this app
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                And it is right to. The installer is not signed, because a certificate costs more
                per year than this tool earns, which is nothing. Click{" "}
                <span className="text-foreground">More info</span>, then{" "}
                <span className="text-foreground">Run anyway</span>. Every release ships with a
                SHA-256 you can check first.
              </p>
            </div>
          </Band>

          <Band title="Questions">
            <div className="mt-8 max-w-[68ch]">
              {FAQ.map((item) => (
                <details key={item.q} className="group border-b border-border py-4">
                  <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 text-[17px] text-foreground transition-colors hover:text-primary">
                    {item.q}
                    <span className="shrink-0 text-lg leading-none text-muted-foreground transition-transform duration-300 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 pr-8 text-[15px] leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </Band>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

/**
 * A page section.
 *
 * The heading carries its own weight — no eyebrow label above it, and no
 * section number, because the order of these sections is not information the
 * reader needs. The old `02 · WHY BOTHER TRACKING AT ALL` was a wide-tracked
 * mono label doing the job of a heading at a third of the size.
 */
function Band({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-24 sm:mt-32">
      <h2 className="max-w-[20ch] font-display text-3xl font-light leading-[1.1] tracking-[-0.015em] text-foreground sm:text-[2.5rem]">
        {title}
      </h2>
      {lede ? (
        <p className="mt-3 max-w-[56ch] text-lg leading-relaxed text-muted-foreground">{lede}</p>
      ) : null}
      {children}
    </section>
  );
}

/**
 * Sources, on request rather than in the way.
 *
 * Native `<details>` rather than a modal: nothing here needs to interrupt the
 * reader or take focus, and a dialog for optional background reading is the
 * wrong instrument.
 */
function EvidenceCards({ sources }: { sources: Evidence[] }) {
  return (
    <details className="group mt-8 max-w-[68ch]">
      <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[var(--water)] hover:text-foreground">
        <span className="transition-transform duration-300 group-open:rotate-45">+</span>
        Where this comes from
        <span className="tabular-nums text-muted-foreground/70">{sources.length} sources</span>
      </summary>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {sources.map((s) => (
          <li key={s.url}>
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex h-full flex-col rounded-2xl border border-border bg-card/60 p-4 transition-colors hover:border-[var(--water)]"
            >
              <p className="text-[13px] leading-snug text-foreground">{s.claim}</p>
              <p className="mt-3 text-[13px] leading-snug text-muted-foreground">{s.title}</p>
              <p className="mt-auto pt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--sage-deep)]">
                {s.publisher} · {s.year}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
