import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { toolMetadata } from "@/lib/capytools/og";
import { WrappedFlow } from "@/components/tool/WrappedFlow";

export const metadata = toolMetadata("CapyWrapped", {
  title: "GitHub Wrapped — your year of contributions in one card | CapyWrapped",
  description:
    "Your GitHub year, wrapped in a calm little card. No signup. No cookies. Nothing stored.",
});

export default function CapyWrapped() {
  return (
    <ToolPageShell
      tool="CapyWrapped"
      headline={[
        { text: "Your GitHub year," },
        { text: "in a calm little card", em: true, dot: true },
      ]}
      lead="no signup. no cookies. nothing stored."
    >
      <WrappedFlow />
    </ToolPageShell>
  );
}
