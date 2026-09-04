import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { CapyCreator } from "@/components/tool/CapyCreator";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";

export const metadata = {
  title: "CapyCreator — model-aware prompt engineering",
  description:
    "A calm, model-aware prompt engineering tool for Gemini, Claude, DeepSeek, GPT, Qwen and open models. No signup, no cookies, nothing stored.",
};

export default function CapyCreatorPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <Header tool="CapyCreator" />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 pb-20">
        <section className="flex w-full flex-col items-center pt-5 text-center sm:pt-8">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              CapyCreator · tool no. 3
            </p>
          </Reveal>

          <h1 className="mt-5 font-display text-5xl font-light leading-[1.04] tracking-tight text-foreground sm:text-6xl">
            <TextReveal text="A prompt engineered," delay={0.1} />
            <br />
            <em className="italic">
              <TextReveal text="for your model." delay={0.32} />
            </em>
          </h1>

          <Reveal delay={0.2}>
            <p className="mt-5 text-base text-muted-foreground">
              interrogates intent and scales scaffolding per model capability tier. all local.
            </p>
          </Reveal>

          <Reveal delay={0.3} className="mt-9 w-full text-left">
            <CapyCreator />
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
