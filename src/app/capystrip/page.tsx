import { AmbientBackground } from "@/components/AmbientBackground";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { CapyStrip } from "@/components/tool/CapyStrip";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";

export const metadata = {
  title: "CapyStrip — remove photo metadata (EXIF) in your browser",
  description:
    "See the GPS, device and AI fingerprints hiding in your photos, then download a clean copy. 100% in your browser — files are never uploaded.",
};

export default function CapyStripPage() {
  return (
    // No `bg-background` here on purpose: body already paints it, and an opaque
    // wrapper would cover the fixed ambient layer sitting at -z-10.
    <div className="flex min-h-dvh flex-col text-foreground">
      <AmbientBackground />
      <Header tool="CapyStrip" />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 pb-20">
        <section className="flex w-full flex-col items-center pt-5 text-center sm:pt-8">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              CapyStrip · tool no. 4
            </p>
          </Reveal>

          <h1 className="mt-5 font-display text-5xl font-light leading-[1.04] tracking-tight text-foreground sm:text-6xl">
            <TextReveal text="your photos talk." delay={0.1} />
            <br />
            <em className="italic">
              <TextReveal text="this one helps them forget." delay={0.32} />
            </em>
          </h1>

          <Reveal delay={0.2}>
            <p className="mt-5 text-base text-muted-foreground">
              see what a photo carries — gps, device, ai fingerprints — then download a clean copy. all local.
            </p>
          </Reveal>

          <Reveal delay={0.3} className="mt-9 w-full text-left">
            <CapyStrip />
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
