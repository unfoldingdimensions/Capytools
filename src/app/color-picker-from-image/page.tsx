import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { CapyTone } from "@/components/tool/CapyTone";
import { intentMetadata } from "@/lib/capytools/og";
import { intentPage } from "@/lib/capytools/intents";

const page = intentPage("/color-picker-from-image");

export const metadata = intentMetadata(page);

export default function ColorPickerFromImagePage() {
  return (
    <ToolPageShell tool={page.tool} headline={page.headline} lead={page.lead} intent={page} align="left">
      <CapyTone initialMode="image" />
    </ToolPageShell>
  );
}
