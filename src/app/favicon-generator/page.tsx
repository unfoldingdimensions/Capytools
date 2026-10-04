import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { CapyResize } from "@/components/tool/CapyResize";
import { intentMetadata } from "@/lib/capytools/og";
import { intentPage } from "@/lib/capytools/intents";

const page = intentPage("/favicon-generator");

export const metadata = intentMetadata(page);

export default function FaviconGeneratorPage() {
  return (
    <ToolPageShell tool={page.tool} headline={page.headline} lead={page.lead} intent={page} align="left">
      <CapyResize initialStage="favicon" />
    </ToolPageShell>
  );
}
