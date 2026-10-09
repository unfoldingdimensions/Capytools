import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { toolMetadata } from "@/lib/capytools/og";
import { CapyInvoice } from "@/components/tool/CapyInvoice";

export const metadata = toolMetadata("CapyInvoice", {
  title: "Free invoice generator — invoices, quotes and receipts to PDF | CapyInvoice",
  description:
    "Make an invoice, quote or receipt with per-line tax, discounts and any currency, and download a real PDF — no signup, no watermark. 100% in your browser: nothing you type leaves this tab.",
});

export default function CapyInvoicePage() {
  return (
    <ToolPageShell
      tool="CapyInvoice"
      headline={[
        { text: "Paid on time," },
        { text: "in one quiet tab", em: true, dot: true },
      ]}
      lead="invoices, quotes and receipts to pdf, with the arithmetic done properly. made in your tab, uploaded nowhere."
      align="left"
      wide
    >
      <CapyInvoice />
    </ToolPageShell>
  );
}
