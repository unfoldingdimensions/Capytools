import { notFound } from "next/navigation";
import { CAPYRESUME_GUIDES_LIVE } from "@/lib/capyresume/seo/live";

/**
 * The CapyResume guide pages (templates, by role, by country, ATS format) are held
 * back for the paid tier. Every route in this group answers 404 until the switch in
 * seo/live.ts is turned on; the pages themselves are kept, unchanged, for that day.
 */
export default function CapyResumeGuidesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!CAPYRESUME_GUIDES_LIVE) notFound();
  return children;
}
