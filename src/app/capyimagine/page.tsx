import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { toolMetadata } from "@/lib/capytools/og";
import { PromptGen } from "@/components/tool/PromptGen";

export const metadata = toolMetadata("CapyImagine", {
  title: "CapyImagine — random image & video prompts",
  description:
    "A calm random prompt generator for Gemini, Midjourney, Flux, SDXL and video models. No signup, no cookies, nothing stored.",
});

export default function CapyImagine() {
  return (
    <ToolPageShell
      tool="CapyImagine"
      eyebrow="CapyImagine · tool no. 2"
      headline={[{ text: "A prompt worth" }, { text: "rendering", em: true, dot: true }]}
      lead="random image & video prompts, tuned per engine. all local."
      align="left"
    >
      <PromptGen />
    </ToolPageShell>
  );
}
