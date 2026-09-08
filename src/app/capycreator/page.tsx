import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { CapyCreator } from "@/components/tool/CapyCreator";

export const metadata = {
  title: "CapyCreator — model-aware prompt engineering",
  description:
    "A calm, model-aware prompt engineering tool for Gemini, Claude, DeepSeek, GPT, Qwen and open models. No signup, no cookies, nothing stored.",
};

export default function CapyCreatorPage() {
  return (
    <ToolPageShell
      tool="CapyCreator"
      eyebrow="CapyCreator · tool no. 3"
      index="Nº 03 / 05"
      headline={[{ text: "A prompt engineered," }, { text: "for your model", em: true, dot: true }]}
      lead="interrogates intent and scales scaffolding per model capability tier. all local."
      align="left"
    >
      <CapyCreator />
    </ToolPageShell>
  );
}
