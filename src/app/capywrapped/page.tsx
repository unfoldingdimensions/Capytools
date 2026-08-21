import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { WrappedFlow } from "@/components/tool/WrappedFlow";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";

export const metadata = {
  title: "CapyWrapped — your GitHub year in a calm little card",
  description:
    "Your GitHub year, wrapped in a calm little card. No signup. No cookies. Nothing stored.",
};

export default function CapyWrapped() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <Header tool="CapyWrapped" />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 pb-20">
        <section className="flex w-full flex-col items-center pt-5 text-center sm:pt-8">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              CapyWrapped · tool no. 1
            </p>
          </Reveal>

          <h1 className="mt-5 font-display text-5xl font-light leading-[1.04] tracking-tight text-foreground sm:text-6xl">
            <TextReveal text="Your GitHub year," delay={0.1} />
            <br />
            <em className="italic">
              <TextReveal text="in a calm little card." delay={0.32} />
            </em>
          </h1>

          <Reveal delay={0.2}>
            <p className="mt-5 text-base text-muted-foreground">
              no signup. no cookies. nothing stored.
            </p>
          </Reveal>

          <Reveal delay={0.3} className="mt-9 w-full">
            <WrappedFlow />
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
