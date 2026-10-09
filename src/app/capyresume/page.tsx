import { ToolPageShell } from "@/components/tool/ToolPageShell";
import { toolMetadata } from "@/lib/capytools/og";
import { CapyResume } from "@/components/tool/CapyResume";

export const metadata = toolMetadata("CapyResume", {
  title: "Free resume builder — no signup, PDF & Word download | CapyResume",
  description:
    "Build a clean, single-column resume and export a real PDF or DOCX — no signup, no watermark. 100% in your browser: your details never leave this tab.",
});

export default function CapyResumePage() {
  return (
    <ToolPageShell
      tool="CapyResume"
      headline={[
        { text: "A CV that's" },
        { text: "actually yours", em: true, dot: true },
      ]}
      lead="Build it, export a real PDF or DOCX, keep the JSON. Made in your tab, uploaded nowhere."
      align="left"
      wide
    >
      <CapyResume />
    </ToolPageShell>
  );
}
