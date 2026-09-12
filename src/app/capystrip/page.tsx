import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { CapyStrip } from "@/components/tool/CapyStrip";

export const metadata = {
  title: "CapyStrip — remove photo metadata (EXIF) in your browser",
  description:
    "See the GPS, device and AI fingerprints hiding in your photos, then download a clean copy. 100% in your browser — files are never uploaded.",
};

export default function CapyStripPage() {
  return (
    <ToolPageShell
      tool="CapyStrip"
      eyebrow="CapyStrip · tool no. 4"
      index="Nº 04 / 05"
      headline={[
        { text: "Your photos talk." },
        { text: "This one helps them forget", em: true, dot: true },
      ]}
      lead="see what a photo carries — gps, device, ai fingerprints — then download a clean copy. all local."
      align="left"
    >
      <CapyStrip />
    </ToolPageShell>
  );
}
