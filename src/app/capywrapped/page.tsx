import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { WrappedFlow } from "@/components/tool/WrappedFlow";

export const metadata = {
  title: "CapyWrapped — your GitHub year in a calm little card",
  description:
    "Your GitHub year, wrapped in a calm little card. No signup. No cookies. Nothing stored.",
};

export default function CapyWrapped() {
  return (
    <ToolPageShell
      tool="CapyWrapped"
      eyebrow="CapyWrapped · tool no. 1"
      index="Nº 01 / 05"
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
