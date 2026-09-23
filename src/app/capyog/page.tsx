import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { toolMetadata } from "@/lib/capytools/og";
import { CapyOG } from "@/components/tool/CapyOG";

export const metadata = toolMetadata("CapyOG", {
  title: "CapyOG — free OG image & social card generator (1200×630)",
  description:
    "Compose Open Graph and social cards for X, LinkedIn, Facebook, Discord, Instagram and Pinterest — then download PNG/JPEG or copy to clipboard. 100% in your browser, nothing uploaded.",
});

export default function CapyOGPage() {
  return (
    <ToolPageShell
      tool="CapyOG"
      headline={[{ text: "A card worth" }, { text: "sharing", em: true, dot: true }]}
      lead="og images & social cards, composed in your browser. all local."
      align="left"
    >
      <CapyOG />
    </ToolPageShell>
  );
}
