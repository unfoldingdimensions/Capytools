import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { toolMetadata } from "@/lib/capytools/og";
import { CapyPassport } from "@/components/tool/CapyPassport";

export const metadata = toolMetadata("CapyPassport", {
  title: "CapyPassport — passport & visa photos in your browser",
  description:
    "Crop a photo to US, UK or Schengen passport and visa specs, check the head geometry against the published rules, and print a sheet at home. Your photo never leaves this tab.",
});

export default function CapyPassportPage() {
  return (
    <ToolPageShell
      tool="CapyPassport"
      headline={[{ text: "A photo that fits" }, { text: "the rules", em: true, dot: true }]}
      lead="Passport and visa photos, checked against the published specs, in your browser. Nothing uploaded."
      align="left"
    >
      <CapyPassport />
    </ToolPageShell>
  );
}
