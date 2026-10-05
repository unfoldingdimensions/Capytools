import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { toolMetadata } from "@/lib/capytools/og";
import { CapyBg } from "@/components/tool/CapyBg";

export const metadata = toolMetadata("CapyBg", {
  title: "Remove image background free — no upload, transparent PNG | CapyBg",
  description:
    "Cut the background out of a photo and download a transparent PNG. 100% in your browser — your image is never uploaded; the only download is the model.",
});

export default function CapyBgPage() {
  return (
    <ToolPageShell
      tool="CapyBg"
      headline={[{ text: "The background," }, { text: "gone", em: true, dot: true }]}
      lead="cut the subject out of any photo, in your browser. nothing uploaded."
      align="left"
    >
      <CapyBg />
    </ToolPageShell>
  );
}
