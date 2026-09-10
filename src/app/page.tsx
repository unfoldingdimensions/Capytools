import type { Metadata } from "next";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Landing } from "@/components/landing/Landing";

export const metadata: Metadata = {
  description:
    "Five small tools that run entirely in your browser and keep nothing. No signup, no cookies, no server.",
  openGraph: {
    title: "Capytools — calm little tools",
    description:
      "Five small tools that run entirely in your browser and keep nothing. No signup, no cookies, no server.",
  },
};

export default function Home() {
  return (
    // No `bg-background` here on purpose: body already paints it, and an opaque
    // wrapper would cover the fixed ambient layer sitting at -z-10.
    <div className="flex min-h-dvh flex-col text-foreground">
      <AmbientBackground />
      <Landing />
    </div>
  );
}
