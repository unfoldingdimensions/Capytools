import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { toolMetadata } from "@/lib/capytools/og";
import { PromptGen } from "@/components/tool/PromptGen";

export const metadata = toolMetadata("CapyImagine", {
  title: "Random AI image & video prompt generator — Midjourney, Flux, SDXL | CapyImagine",
  description:
    "A calm random prompt generator for Gemini, Midjourney, Flux, SDXL and video models. No signup, no cookies, nothing stored.",
});

export default function CapyImagine() {
  return (
    <ToolPageShell
      tool="CapyImagine"
      headline={[{ text: "A prompt worth" }, { text: "rendering", em: true, dot: true }]}
      lead="Random image & video prompts, tuned per engine. All local."
      align="left"
    >
      <PromptGen />
    </ToolPageShell>
  );
}
