import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { CapyResize } from "@/components/tool/CapyResize";

export const metadata = {
  title: "CapyResize — image resizer, converter & favicon pack generator",
  description:
    "Resize and convert images (PNG, JPEG, WebP) with quality you can see, or drop one logo and get every favicon and app icon your site needs in a ZIP. 100% in your browser — files are never uploaded.",
};

export default function CapyResizePage() {
  return (
    <ToolPageShell
      tool="CapyResize"
      eyebrow="CapyResize · tool no. 8"
      index="Nº 08 / 08"
      headline={[{ text: "Every size it" }, { text: "needs to be", em: true, dot: true }]}
      lead="resize, convert and favicon-pack images in your browser. all local."
      align="left"
    >
      <CapyResize />
    </ToolPageShell>
  );
}
