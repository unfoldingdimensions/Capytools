import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { toolMetadata } from "@/lib/capytools/og";
import { CapyPixel } from "@/components/tool/CapyPixel";

export const metadata = toolMetadata("CapyPixel", {
  title: "Pixel art converter — turn photos into pixel art, free | CapyPixel",
  description:
    "Turn photos and logos into pixel art — Game Boy, 1-bit, brand-ramp and faithful styles with measured presets, live preview and crisp PNG export. 100% in your browser, nothing uploaded.",
});

export default function CapyPixelPage() {
  return (
    <ToolPageShell
      tool="CapyPixel"
      headline={[{ text: "Pictures," }, { text: "in chunks", em: true, dot: true }]}
      lead="pixel-art photos and logos in your browser. all local."
      align="left"
    >
      <CapyPixel />
    </ToolPageShell>
  );
}
