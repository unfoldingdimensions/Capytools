import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { CapyResize } from "@/components/tool/CapyResize";
import { intentMetadata } from "@/lib/capytools/og";
import { intentPage } from "@/lib/capytools/intents";

const page = intentPage("/compress-image");

export const metadata = intentMetadata(page);

export default function CompressImagePage() {
  return (
    <ToolPageShell tool={page.tool} headline={page.headline} lead={page.lead} intent={page} align="left">
      <CapyResize initialFormat="jpeg" initialQuality={0.7} />
    </ToolPageShell>
  );
}
