import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { CapyResize } from "@/components/tool/CapyResize";
import { intentMetadata } from "@/lib/capytools/og";
import { intentPage } from "@/lib/capytools/intents";

const page = intentPage("/png-to-jpg");

export const metadata = intentMetadata(page);

export default function PngToJpgPage() {
  return (
    <ToolPageShell tool={page.tool} headline={page.headline} lead={page.lead} intent={page} align="left">
      <CapyResize initialFormat="jpeg" />
    </ToolPageShell>
  );
}
