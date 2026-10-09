import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { CapyInvoice } from "@/components/tool/CapyInvoice";
import { intentMetadata } from "@/lib/capytools/og";
import { intentPage } from "@/lib/capytools/intents";

const page = intentPage("/receipt-maker");

export const metadata = intentMetadata(page);

export default function ReceiptMakerPage() {
  return (
    <ToolPageShell
      tool={page.tool}
      headline={page.headline}
      lead={page.lead}
      intent={page}
      align="left"
      wide
    >
      <CapyInvoice initialKind="receipt" />
    </ToolPageShell>
  );
}
