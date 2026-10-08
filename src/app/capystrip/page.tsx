import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { toolMetadata } from "@/lib/capytools/og";
import { CapyStrip } from "@/components/tool/CapyStrip";

export const metadata = toolMetadata("CapyStrip", {
  title: "EXIF viewer & remover — see and strip photo GPS metadata, free, no upload | CapyStrip",
  description:
    "View the EXIF data in any photo — GPS location, camera, timestamps and AI fingerprints — then download a clean copy if you want one. 100% in your browser, never uploaded.",
});

export default function CapyStripPage() {
  return (
    <ToolPageShell
      tool="CapyStrip"
      headline={[
        { text: "Your photos talk." },
        { text: "This one helps them forget", em: true, dot: true },
      ]}
      lead="See what a photo carries — GPS, device, AI fingerprints — then download a clean copy. All local."
      align="left"
    >
      <CapyStrip />
    </ToolPageShell>
  );
}
