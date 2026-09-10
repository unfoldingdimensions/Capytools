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
 * CapyExpenseShowcase). The page carries exactly one piece of prose beyond
 * that: the status, which is that there is nothing to download yet.
 *
 * There is no download link and no release, so the page must not read as a
 * product page for one. When builds ship, the unsigned-installer note below
 * moves back into the present tense and a download button joins it.
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
          <p className="text-[15px] font-medium text-foreground">
            Not out yet — this is what it will look like.
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            Everything above is the real app running on sample data. The Windows
            and Linux builds are still being packaged, so there is nothing to
            download today. When they land they will be unsigned — a certificate
            costs more per year than this tool earns, which is nothing — so
            Windows will warn you, and every release will ship with a SHA-256 you
            can check first.
          </p>
        </div>
        <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          a desktop tool — stored on your machine, never ours. windows &amp; linux builds coming
          soon.
        </p>
      </div>
    </ToolPageShell>
  );
}
