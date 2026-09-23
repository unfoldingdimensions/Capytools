import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { toolMetadata } from "@/lib/capytools/og";
import { CapyTokenClient } from "@/components/tool/CapyTokenClient";

export const metadata = toolMetadata("CapyToken", {
  title: "CapyToken — free LLM token counter & API cost calculator (offline)",
  description:
    "Count GPT/o200k and cl100k tokens exactly — no signup, no API key, nothing uploaded — and price your prompt across GPT-5, Claude, Gemini and DeepSeek with a verified date stamp. 100% in your browser.",
});

export default function CapyTokenPage() {
  return (
    <ToolPageShell
      tool="CapyToken"
      headline={[{ text: "Count before you" }, { text: "spend", em: true, dot: true }]}
      lead="exact token counts and model costs, computed entirely in your browser. all local."
      align="left"
    >
      <CapyTokenClient />
    </ToolPageShell>
  );
}
