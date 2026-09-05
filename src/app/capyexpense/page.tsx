import { AmbientBackground } from "@/components/AmbientBackground";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { CapyExpenseShowcase } from "@/components/tool/CapyExpenseShowcase";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";

export const metadata = {
  title: "CapyExpense — a local-first expense tracker for Windows and Linux",
  description:
    "A desktop expense dashboard that reads a spreadsheet you type into yourself. No account, no bank login, no cloud, no AI. Your file never leaves your machine.",
};

/** Claims resolve to docs/research/capyexpense/sources.json. */
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

      <main className="flex w-full flex-1 flex-col items-center px-6 pb-20">
        <section className="mx-auto flex w-full max-w-4xl flex-col items-center pt-5 text-center sm:pt-8">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              CapyExpense · tool no. 5
            </p>
          </Reveal>
          <h1 className="mt-5 font-display text-5xl font-light leading-[1.04] tracking-tight text-foreground sm:text-6xl">
            <TextReveal text="You already have the data." delay={0.1} />
            <br />
            <em className="italic">
              <TextReveal text="It just never talks back." delay={0.32} />
            </em>
          </h1>
          <Reveal delay={0.2}>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
              A local expense dashboard that reads a spreadsheet you type into yourself. Windows and
              Linux. No account, no bank login, no cloud, no AI, nothing uploaded.
            </p>
          </Reveal>
        </section>

        <section className="mx-auto mt-12 w-full max-w-5xl text-left">
          <Reveal delay={0.3}>
            <CapyExpenseShowcase />
          </Reveal>
        </section>

        <div className="mx-auto w-full max-w-4xl text-left">
          <Section index="01" title="How it works">
            <div className="grid gap-4 sm:grid-cols-3">
              <Step index="01" title="The workbook">
                CapyExpense creates one .xlsx a year and then never writes over your rows. You type;
                it reads.
              </Step>
              <Step index="02" title="The refresh">
                Save in Excel, then click refresh. It is a file read — there is nothing to wait for.
              </Step>
              <Step index="03" title="The read">
                Five charts and four numbers, every one of them drawn from the rows you typed.
              </Step>
            </div>
          </Section>

          <Section index="02" title="Why bother tracking at all">
            <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">
              <p>
                People who record their expenses spend measurably less. Financial self-control
                strategies — expense self-monitoring among them — carry a medium effect across
                twenty-nine studies <Cite n={1} />. Writing an amount down makes it real in a way an
                automatic bank feed does not: the act of rehearsing a payment is what makes it stick{" "}
                <Cite n={2} />.
              </p>
              <p>
                And the gap is large. People underestimate their upcoming spending by about half, and
                the expenses they miss are precisely the discretionary ones <Cite n={6} />
                <Cite n={7} />. Simply unpacking spending category by category raised remembered
                expenses by 36–60% <Cite n={6} />, which is why the category column is not
                decoration. It is the intervention.
              </p>
              <p>
                Subscriptions are the sharpest version of the same blind spot. Asked to estimate,
                people say $86 a month; itemised, the real figure is $219 — a gap of $133 a month, or
                roughly $1,600 a year <Cite n={34} />. Small recurring charges escape re-evaluation
                by design <Cite n={35} />, which is why this dashboard annualises them and puts the
                number in front of you.
              </p>
            </div>
          </Section>

          <Section index="03" title="Why it stays on your machine">
            <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">
              <p>
                Every mainstream expense app routes your transactions through a data aggregator
                first. YNAB stores in the US and shares with MX and Plaid <Cite n={11} />; Monarch
                shares via Plaid, Finicity, MX and Spinwheel <Cite n={12} />; Rocket Money markets
                “never sell your data” while its own policy admits sharing “in exchange for valuable
                consideration” <Cite n={14} />.
              </p>
              <p>
                The aggregators have a record. Plaid paid $58m to settle a class action over
                harvesting bank credentials <Cite n={9} />; lawmakers asked the FTC to investigate
                Yodlee for selling transaction data to institutional investors <Cite n={10} />; the
                budgeting app Dave leaked 7.5 million user records <Cite n={15} />.
              </p>
              <p className="text-foreground">
                CapyExpense has no network code in it. Not “we don’t upload” — there is no upload
                path to audit. Your year is one .xlsx on your disk, in a format you will still be
                able to open in 2040 whether or not this project exists.
              </p>
              <p>
                The dashboard above is the same code the app runs, on invented numbers. Nothing on
                this page phones home either.
              </p>
            </div>
          </Section>

          <Section index="04" title="Get it">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-primary px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--primary-foreground)] opacity-60">
                  Windows · coming soon
                </span>
                <span className="rounded-full border border-border px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground opacity-60">
                  Linux · coming soon
                </span>
              </div>

              <div className="mt-5 rounded-2xl border border-border/70 bg-muted/40 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  About the Windows warning
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Windows will say it does not recognise this app. It is right: the installer is not
                  signed, because a certificate costs more per year than this tool earns, which is
                  nothing. Click <span className="text-foreground">More info</span>, then{" "}
                  <span className="text-foreground">Run anyway</span>. Every release ships with a
                  SHA-256 you can check first.
                </p>
              </div>
            </div>
          </Section>

          <Section index="05" title="Questions">
            <div className="divide-y divide-border/70">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-3.5">
                  <summary className="cursor-pointer list-none text-[15px] text-foreground transition-colors hover:text-primary">
                    {item.q}
                    <span className="ml-1.5 inline-block text-muted-foreground transition-transform group-open:rotate-90">
                      ›
                    </span>
                  </summary>
                  <p className="mt-2 pr-6 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          </Section>

          <p className="mt-12 text-center text-xs text-muted-foreground">
            Numbered claims resolve to a ledger of 36 verified sources, kept alongside the code.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Section({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-16">
      <Reveal>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {index} · {title}
        </p>
      </Reveal>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Step({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {index}
      </span>
      <p className="mt-2 font-display text-lg font-light text-foreground">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function Cite({ n }: { n: number }) {
  return (
    <sup className="ml-0.5 font-mono text-[10px] text-[var(--water)]" aria-label={`source ${n}`}>
      [{n}]
    </sup>
  );
}
