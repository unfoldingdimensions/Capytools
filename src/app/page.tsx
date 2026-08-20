import { Header } from "@/components/header";
import { WrappedFlow } from "@/components/tool/WrappedFlow";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 pb-20">
        <section className="flex w-full flex-col items-center pt-5 text-center sm:pt-8">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Cappy Wrapped · tool no. 1
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
              no signup. no tracking. nothing stored.
            </p>
          </Reveal>

          <Reveal delay={0.3} className="mt-9 w-full">
            <WrappedFlow />
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-2 px-6 py-6 sm:flex-row">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            capytools — no analytics. no cookies. nothing stored.
          </p>
          <p className="text-xs text-muted-foreground">more calm tools, coming soon</p>
        </div>
      </footer>
    </div>
  );
}
