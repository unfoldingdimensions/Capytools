import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { CapyToken } from "@/components/tool/CapyToken";

export const metadata = {
  title: "CapyToken — free LLM token counter & API cost calculator (offline)",
  description:
    "Count GPT/o200k and cl100k tokens exactly — no signup, no API key, nothing uploaded — and price your prompt across GPT-5, Claude, Gemini and DeepSeek with a verified date stamp. 100% in your browser.",
};

export default function CapyTokenPage() {
  return (
    <ToolPageShell
      tool="CapyToken"
      eyebrow="CapyToken · tool no. 9"
      headline={[{ text: "Count before you" }, { text: "spend", em: true, dot: true }]}
      lead="exact token counts and model costs, computed entirely in your browser. all local."
      align="left"
    >
      <CapyToken />
    </ToolPageShell>
  );
}
