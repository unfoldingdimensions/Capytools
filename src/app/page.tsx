import type { Metadata } from "next";
import { AmbientBackground } from "@/components/AmbientBackground";
import { JsonLd } from "@/components/JsonLd";
import { Landing } from "@/components/landing/Landing";
import { OG_DEFAULTS } from "@/lib/capytools/og";
import { homepageGraphLd } from "@/lib/capytools/structured-data";
import { SUITE_WORD_CAP } from "@/lib/capytools/suite";

const description = `${SUITE_WORD_CAP} small tools that run entirely in your browser and keep nothing. No signup, no cookies, no server.`;

export const metadata: Metadata = {
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Capytools — calm little tools",
    description,
    // Spread, not omitted: Next replaces the layout's `openGraph` wholesale
    // when a page declares its own, so leaving this out drops the share card.
    ...OG_DEFAULTS,
  },
};

export default function Home() {
  return (
    // No `bg-background` here on purpose: body already paints it, and an opaque
    // wrapper would cover the fixed ambient layer sitting at -z-10.
    <div className="flex min-h-dvh flex-col text-foreground">
      {/* The brand's identity and the site itself, stated once, on the one
          page a crawler treats as the root of both — in a single @graph,
          because as two sibling blocks the validator kept only the second. */}
      <JsonLd data={homepageGraphLd()} />
      <AmbientBackground />
      <Landing />
    </div>
  );
}
