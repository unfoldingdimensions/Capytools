import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { CapyOG } from "@/components/tool/CapyOG";
import { intentMetadata } from "@/lib/capytools/og";
import { intentPage } from "@/lib/capytools/intents";

const page = intentPage("/og-image-size");

export const metadata = intentMetadata(page);

export default function OgImageSizePage() {
  return (
    <ToolPageShell tool={page.tool} headline={page.headline} lead={page.lead} intent={page} align="left">
      <CapyOG />
    </ToolPageShell>
  );
}
