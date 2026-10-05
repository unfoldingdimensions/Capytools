import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { CapyQR } from "@/components/tool/CapyQR";
import { intentMetadata } from "@/lib/capytools/og";
import { intentPage } from "@/lib/capytools/intents";

const page = intentPage("/vcard-qr-code-generator");

export const metadata = intentMetadata(page);

export default function VcardQrCodeGeneratorPage() {
  return (
    <ToolPageShell tool={page.tool} headline={page.headline} lead={page.lead} intent={page} align="left">
      <CapyQR initialKind="contact" />
    </ToolPageShell>
  );
}
