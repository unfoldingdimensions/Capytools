import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { toolMetadata } from "@/lib/capytools/og";
import { CapyTone } from "@/components/tool/CapyTone";

export const metadata = toolMetadata("CapyTone", {
  title: "CapyTone — type a feeling, get a poster",
  description:
    "A mood phrase becomes a deterministic five-colour palette and a shareable poster card, drawn by a hand-tuned lexicon — no AI, no signup. 100% in your browser — nothing is stored.",
});

export default function CapyTonePage() {
  return (
    <ToolPageShell
      tool="CapyTone"
      headline={[{ text: "Type a feeling," }, { text: "get a poster", em: true, dot: true }]}
      lead="a hand-tuned lexicon turns any mood phrase into a five-colour palette — deterministic, no AI, nothing leaves the tab."
      align="left"
    >
      <CapyTone />
    </ToolPageShell>
  );
}
