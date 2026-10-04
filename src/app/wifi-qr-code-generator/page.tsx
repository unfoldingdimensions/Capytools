import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { CapyQR } from "@/components/tool/CapyQR";
import { intentMetadata } from "@/lib/capytools/og";
import { intentPage } from "@/lib/capytools/intents";

const page = intentPage("/wifi-qr-code-generator");

export const metadata = intentMetadata(page);

export default function WifiQrCodeGeneratorPage() {
  return (
    <ToolPageShell tool={page.tool} headline={page.headline} lead={page.lead} intent={page} align="left">
      <CapyQR initialKind="wifi" />
    </ToolPageShell>
  );
}
