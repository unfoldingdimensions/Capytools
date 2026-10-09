import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { toolMetadata } from "@/lib/capytools/og";
import { CapyRead } from "@/components/tool/CapyRead";

export const metadata = toolMetadata("CapyRead", {
  title: "Image & PDF to text (OCR) free — no upload | CapyRead",
  description:
    "Extract the text from a photo, screenshot or scanned PDF on your own device. 100% in your browser — your file never leaves this tab and is never uploaded.",
});

export default function CapyReadPage() {
  return (
    <ToolPageShell
      tool="CapyRead"
      headline={[{ text: "The words are" }, { text: "in there", em: true, dot: true }]}
      lead="Read the text out of a photo or a scanned pdf, in your browser. Nothing uploaded."
      align="left"
    >
      <CapyRead />
    </ToolPageShell>
  );
}
