import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { CapyExpenseShowcase } from "@/components/tool/CapyExpenseShowcase";

export const metadata = {
  title: "CapyExpense — a local-first expense tracker for Windows and Linux",
  description:
    "A desktop expense dashboard that reads a spreadsheet you type into yourself. No account, no bank login, no cloud, no AI. Your file never leaves your machine.",
};

/**
 * Two screens: the hero chart (screen one), and the whole dashboard behind
 * `Show the whole dashboard` (screen two — the in-card switcher in
 * CapyExpenseShowcase). The page carries exactly two pieces of prose beyond
 * that: how to get it, and what the unsigned installer means.
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
      <CapyExpenseShowcase />

      <div className="mx-auto mt-16 w-full max-w-[68ch] text-left">
        <div className="rounded-2xl border border-[var(--clay)]/25 bg-[var(--clay)]/[0.07] p-5">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-foreground">
              Windows will warn you about this app
              <span className="shrink-0 text-lg leading-none text-muted-foreground transition-transform duration-300 group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
              And it is right to. The installer is not signed, because a certificate costs more per
              year than this tool earns, which is nothing. Click{" "}
              <span className="text-foreground">More info</span>, then{" "}
              <span className="text-foreground">Run anyway</span>. Every release ships with a
              SHA-256 you can check first.
            </p>
          </details>
        </div>
        <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          a desktop tool — stored on your machine, never ours. windows &amp; linux builds coming
          soon.
        </p>
      </div>
    </ToolPageShell>
  );
}
