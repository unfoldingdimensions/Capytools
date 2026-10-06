import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { PromptGen } from "@/components/tool/PromptGen";
import { intentMetadata } from "@/lib/capytools/og";
import { intentPage } from "@/lib/capytools/intents";

const page = intentPage("/midjourney-prompt-generator");

export const metadata = intentMetadata(page);

export default function MidjourneyPromptGeneratorPage() {
  return (
    <ToolPageShell tool={page.tool} headline={page.headline} lead={page.lead} intent={page} align="left">
      <PromptGen initialEngine="Midjourney" />
    </ToolPageShell>
  );
}
