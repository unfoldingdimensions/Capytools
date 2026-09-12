import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { CapyQR } from "@/components/tool/CapyQR";

export const metadata = {
  title: "CapyQR — styled QR code generator (Wi-Fi, vCard, colors, logo)",
  description:
    "Design a QR code with your colors, shapes and logo — then watch the tool scan its own output before you export PNG, JPEG or SVG. 100% in your browser, nothing uploaded.",
};

export default function CapyQRPage() {
  return (
    <ToolPageShell
      tool="CapyQR"
      eyebrow="CapyQR · tool no. 7"
      headline={[{ text: "A code worth" }, { text: "scanning", em: true, dot: true }]}
      lead="styled wi-fi, contact and link codes, composed and proof-scanned in your browser. all local."
      align="left"
    >
      <CapyQR />
    </ToolPageShell>
  );
}
