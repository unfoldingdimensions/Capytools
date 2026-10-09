import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { toolMetadata } from "@/lib/capytools/og";
import { CapyQR } from "@/components/tool/CapyQR";

export const metadata = toolMetadata("CapyQR", {
  title: "Free QR code generator with logo — Wi-Fi, vCard, no tracking | CapyQR",
  description:
    "Design a QR code with your colors, shapes and logo — then watch the tool scan its own output before you export PNG, JPEG or SVG. 100% in your browser, nothing uploaded.",
});

export default function CapyQRPage() {
  return (
    <ToolPageShell
      tool="CapyQR"
      headline={[{ text: "A code worth" }, { text: "scanning", em: true, dot: true }]}
      lead="Styled Wi-Fi, contact and link codes, composed and proof-scanned in your browser. All local."
      align="left"
    >
      <CapyQR />
    </ToolPageShell>
  );
}
