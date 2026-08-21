import { AmbientBackground } from "@/components/AmbientBackground";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/Reveal";
import { TextReveal } from "@/components/TextReveal";
import { TransitionLink } from "@/components/TransitionLink";

const TOOLS = [
  {
    href: "/capywrapped",
    eyebrow: "tool no. 1",
    name: "CapyWrapped",
    line: "Your GitHub year in a calm little card, ready to share.",
  },
  {
    href: "/capyimagine",
    eyebrow: "tool no. 2",
    name: "CapyImagine",
    line: "Random image and video prompts, written in your engine's dialect.",
  },
];

export default function Home() {
  return (
    // No `bg-background` here on purpose: body already paints it, and an opaque
    // wrapper would cover the fixed ambient layer sitting at -z-10.
    <div className="flex min-h-dvh flex-col text-foreground">
      <AmbientBackground />
      <Header />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 pb-20">
        <section className="flex w-full flex-col items-center pt-10 text-center sm:pt-16">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Capytools · calm little tools
            </p>
          </Reveal>

          <h1 className="mt-5 font-display text-5xl font-light leading-[1.04] tracking-tight text-foreground sm:text-6xl">
            <TextReveal text="Small tools," delay={0.1} />
            <br />
            <em className="italic">
              <TextReveal text="made quiet." delay={0.32} />
            </em>
          </h1>

          <Reveal delay={0.2}>
            <p className="mt-5 max-w-md text-base text-muted-foreground">
              Two of them so far. Both run in your browser and keep nothing.
            </p>
          </Reveal>

          {/* 100ms apart — the standard stagger, and well inside the 500ms budget. */}
          <div className="mt-12 grid w-full gap-4 text-left sm:grid-cols-2">
            {TOOLS.map((tool, i) => (
              <Reveal key={tool.href} delay={0.3 + i * 0.1}>
                <TransitionLink
                  href={tool.href}
                  className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-sm transition-[transform,box-shadow] duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                    {tool.eyebrow}
                  </p>
                  <h2 className="mt-3 font-display text-2xl font-normal tracking-tight text-foreground">
                    {tool.name}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {tool.line}
                  </p>
                  <p className="mt-6 flex items-center gap-1.5 text-sm font-medium text-primary">
                    open
                    <span
                      aria-hidden
                      className="inline-block transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 motion-reduce:transition-none"
                    >
                      →
                    </span>
                  </p>
                </TransitionLink>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
