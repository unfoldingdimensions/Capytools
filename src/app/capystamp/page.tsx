import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { toolMetadata } from "@/lib/capytools/og";
import { CapyStamp } from "@/components/tool/CapyStamp";

export const metadata = toolMetadata("CapyStamp", {
  title: "Add a watermark to photos free — logo or text, batch, no upload | CapyStamp",
  description:
    "Add a text or logo watermark to one photo or twenty, with full control over placement, size, opacity and tiling. 100% in your browser — your photos are never uploaded.",
});

export default function CapyStampPage() {
  return (
    <ToolPageShell
      tool="CapyStamp"
      headline={[{ text: "Put your" }, { text: "mark on it", em: true, dot: true }]}
      lead="watermark one photo or a whole batch, in your browser. nothing uploaded."
      align="left"
    >
      <CapyStamp />
    </ToolPageShell>
  );
}
