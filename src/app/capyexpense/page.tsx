import { AmbientBackground } from "@/components/AmbientBackground";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { CapyExpenseDemo } from "@/components/tool/CapyExpenseDemo";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";

export const metadata = {
  title: "CapyExpense — a local-first expense tracker for windows and linux",
  description:
    "A desktop expense dashboard that reads a spreadsheet you type into yourself. No account, no bank login, no cloud, no AI. Your file never leaves your machine.",
};

/** Claims resolve to docs/research/capyexpense/sources.json. */
const FAQ = [
  {
    q: "does it read my bank?",
    a: "no. there is no bank connection in it, and no way to add one. you type rows into a spreadsheet and capyexpense reads that file.",
  },
  {
    q: "what if i already have a spreadsheet?",
    a: "paste your columns in. the headers are the whole format — date, category, type, amount — and it reads them by name, so the order does not matter. it also accepts a csv.",
  },
  {
    q: "can i edit past years?",
    a: "yes. one workbook per year, and it loads all of them together, so any date range works across as many years as you have.",
  },
  {
    q: "what happens on 1 january?",
    a: "it offers you a fresh workbook. last year's stays exactly where it is.",
  },
  {
    q: "will an old file still open after an update?",
    a: "yes, and that is a rule rather than a hope. columns are only ever added to the right, never renamed or removed, columns capyexpense does not recognise are kept untouched, and a file from a newer version still opens. reading never writes to your workbook.",
  },
  {
    q: "is there a mac build?",
    a: "not yet. gatekeeper blocks unsigned apps outright rather than warning about them, so a mac build needs a paid apple account to be worth shipping.",
  },
  {
    q: "what does it cost?",
    a: "nothing, and there is nothing to upsell. that is also why the installer is unsigned — see the note above.",
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
            <TextReveal text="you already have the data." delay={0.1} />
            <br />
            <em className="italic">
              <TextReveal text="it just never talks back." delay={0.32} />
            </em>
          </h1>
          <Reveal delay={0.2}>
            <p className="mt-5 max-w-2xl text-base text-muted-foreground">
              a local expense dashboard that reads a spreadsheet you type into yourself. windows and
              linux. no account, no bank login, no cloud, no ai, nothing uploaded.
            </p>
          </Reveal>
        </section>

        {/* The demo comes before the argument. Showing beats claiming. */}
        <section className="mx-auto mt-12 w-full max-w-6xl text-left">
          <Reveal delay={0.3}>
            <CapyExpenseDemo />
          </Reveal>
        </section>

        <div className="mx-auto w-full max-w-4xl text-left">
          <Section index="01" title="how it works">
            <div className="grid gap-4 sm:grid-cols-3">
              <Step index="01" title="the workbook">
                capyexpense makes one .xlsx a year and then never writes over your rows. you type; it
                reads.
              </Step>
              <Step index="02" title="the refresh">
                save in excel, click refresh here. it is a file read — there is nothing to wait for.
              </Step>
              <Step index="03" title="the read">
                five charts and four numbers, all of it drawn from the rows you typed.
              </Step>
            </div>
          </Section>

          <Section index="02" title="why bother tracking at all">
            <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">
              <p>
                people who record their expenses spend measurably less. financial self-control
                strategies, expense self-monitoring among them, carry a medium effect across
                twenty-nine studies <Cite n={1} />. writing an amount down makes it real in a way an
                automatic bank feed does not — the act of rehearsing a payment is what makes it stick{" "}
                <Cite n={2} />.
              </p>
              <p>
                and the gap is large. people underestimate their upcoming spending by about half, and
                the expenses they miss are precisely the discretionary ones <Cite n={6} />
                <Cite n={7} />. simply unpacking spending category by category raised remembered
                expenses by 36–60% <Cite n={6} /> — which is why the category column is not
                decoration. it is the intervention.
              </p>
              <p>
                subscriptions are the sharpest version of the same blind spot. asked to estimate,
                people say $86 a month; itemised, the real figure is $219 — a gap of $133 a month,
                about $1,600 a year <Cite n={34} />. small recurring charges escape re-evaluation by
                design <Cite n={35} />, which is why this dashboard annualises them and shows you the
                number.
              </p>
            </div>
          </Section>

          <Section index="03" title="why it stays on your machine">
            <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">
              <p>
                every mainstream expense app routes your transactions through a data aggregator
                first. ynab stores in the us and shares with mx and plaid <Cite n={11} />; monarch
                shares via plaid, finicity, mx and spinwheel <Cite n={12} />; rocket money markets
                &ldquo;never sell your data&rdquo; while its own policy admits sharing &ldquo;in
                exchange for valuable consideration&rdquo; <Cite n={14} />.
              </p>
              <p>
                the aggregators have a record. plaid paid $58m to settle a class action over
                harvesting bank credentials <Cite n={9} />; lawmakers asked the ftc to investigate
                yodlee for selling transaction data to institutional investors <Cite n={10} />; the
                budgeting app dave leaked 7.5 million user records <Cite n={15} />.
              </p>
              <p className="text-foreground">
                capyexpense has no network code in it. not &ldquo;we don&rsquo;t upload&rdquo; — there
                is no upload path to audit. your year is one .xlsx on your disk, in a format you will
                still be able to open in 2040 whether or not this project exists.
              </p>
              <p>
                the dashboard you just scrolled through is the same code the app runs, on invented
                numbers. nothing on this page phones home either.
              </p>
            </div>
          </Section>

          <Section index="04" title="get it">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-primary px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--primary-foreground)] opacity-60">
                  windows · coming soon
                </span>
                <span className="rounded-full border border-border px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground opacity-60">
                  linux · coming soon
                </span>
              </div>

              <div className="mt-5 rounded-2xl border border-border/70 bg-muted/40 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  about the windows warning
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  windows will say it does not recognise this app. it is right: the installer is not
                  signed, because a certificate costs more per year than this tool earns, which is
                  nothing. click <span className="text-foreground">more info</span>, then{" "}
                  <span className="text-foreground">run anyway</span>. every release ships with a
                  sha-256 you can check first.
                </p>
              </div>
            </div>
          </Section>

          <Section index="05" title="questions">
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
            numbered claims resolve to a source ledger of 36 verified references, kept alongside the
            code.
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
