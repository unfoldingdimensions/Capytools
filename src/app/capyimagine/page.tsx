import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { PromptGen } from "@/components/tool/PromptGen";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";

export const metadata = {
  title: "CapyImagine — random image & video prompts",
  description:
    "A calm random prompt generator for Gemini, Midjourney, Flux, SDXL and video models. No signup, no cookies, nothing stored.",
};

export default function CapyImagine() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <Header tool="CapyImagine" />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 pb-20">
        <section className="flex w-full flex-col items-center pt-5 text-center sm:pt-8">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              CapyImagine · tool no. 2
            </p>
          </Reveal>

          <h1 className="mt-5 font-display text-5xl font-light leading-[1.04] tracking-tight text-foreground sm:text-6xl">
            <TextReveal text="A prompt worth" delay={0.1} />
            <br />
            <em className="italic">
              <TextReveal text="rendering." delay={0.32} />
            </em>
          </h1>

          <Reveal delay={0.2}>
            <p className="mt-5 text-base text-muted-foreground">
              random image &amp; video prompts, tuned per engine. all local.
            </p>
          </Reveal>

          <Reveal delay={0.3} className="mt-9 w-full text-left">
            <PromptGen />
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
