import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { CapyPixel } from "@/components/tool/CapyPixel";

export const metadata = {
  title: "CapyPixel — pixel art converter & image quantizer",
  description:
    "Turn photos and logos into pixel art — Game Boy, 1-bit, brand-ramp and faithful styles with measured presets, live preview and crisp PNG export. 100% in your browser, nothing uploaded.",
};

export default function CapyPixelPage() {
  return (
    <ToolPageShell
      tool="CapyPixel"
      eyebrow="CapyPixel · tool no. 10"
      headline={[{ text: "Pictures," }, { text: "in chunks", em: true, dot: true }]}
      lead="pixel-art photos and logos in your browser. all local."
      align="left"
    >
      <CapyPixel />
    </ToolPageShell>
  );
}
