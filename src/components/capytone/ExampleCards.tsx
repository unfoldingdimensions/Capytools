"use client";

/**
 * The lexicon gallery — a living window into the engine.
 *
 * Four cards are visible at a time; every CYCLE_MS the group crossfades to
 * the next four (1-4 → 5-8 → … → wraps). The crossfade dips the whole grid's
 * opacity, swaps the moods at the dip's floor, then rises again — cheap,
 * jank-free, and it never fights React reconciliation because the canvases
 * themselves stay mounted while only their contents change.
 *
 * Pauses on hover (so a click target never vanishes mid-hover) and whenever
 * the section is offscreen. prefers-reduced-motion swaps without the fade.
 *
 * On the standalone landing this cycled four square canvases; here it lives
 * on the tool page as the "from the lexicon" section, deep-linking each card
 * back into the mood flow via ?mood=.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { renderCard, type LayoutName } from "@/lib/capytone/render";
import { generatePalette } from "@/lib/capytone/engine/generate";

const PICKS: { mood: string; layout: LayoutName }[] = [
  // warm/cozy
  { mood: "cozy autumn morning", layout: "editorial" },
  { mood: "fireside night", layout: "minimal" },
  { mood: "vanilla sunday", layout: "minimal" },
  { mood: "cinnamon cafe", layout: "editorial" },
  { mood: "honeyed afternoon", layout: "minimal" },
  // cold/crisp
  { mood: "first frost", layout: "editorial" },
  { mood: "arctic night", layout: "minimal" },
  { mood: "coastal fog", layout: "editorial" },
  { mood: "alpine stream", layout: "minimal" },
  { mood: "rainy tuesday", layout: "editorial" },
  // rainy/grey + night
  { mood: "monsoon", layout: "minimal" },
  { mood: "petrichor", layout: "editorial" },
  { mood: "thunderstorm", layout: "minimal" },
  { mood: "night rain", layout: "editorial" },
  { mood: "late library", layout: "editorial" },
  { mood: "overcast saturday", layout: "minimal" },
  // fresh/natural
  { mood: "spring meadow", layout: "editorial" },
  { mood: "moss carpet", layout: "minimal" },
  { mood: "fern gully", layout: "editorial" },
  { mood: "bamboo grove", layout: "minimal" },
  { mood: "eucalyptus light", layout: "editorial" },
  // festive/loud
  { mood: "diwali lights", layout: "editorial" },
  { mood: "carnival night", layout: "editorial" },
  { mood: "confetti pop", layout: "minimal" },
  { mood: "harvest fair", layout: "editorial" },
  { mood: "brass band evening", layout: "minimal" },
  // pastel/soft
  { mood: "cherry blossom", layout: "minimal" },
  { mood: "baby blanket", layout: "editorial" },
  { mood: "lavender haze", layout: "minimal" },
  { mood: "peach morning", layout: "editorial" },
  { mood: "sea foam", layout: "minimal" },
];

const VISIBLE = 4;
const CYCLE_MS = 4200;
const FADE_MS = 380;
const PAGES = Math.ceil(PICKS.length / VISIBLE);

export function ExampleCards() {
  const [page, setPage] = useState(0);
  const [faded, setFaded] = useState(false);
  const pausedRef = useRef(false);
  const onscreenRef = useRef(true);
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  const swapTimer = useRef<number | null>(null);

  const slice = PICKS.slice(page * VISIBLE, page * VISIBLE + VISIBLE);

  const drawSlice = useCallback((p: number) => {
    const items = PICKS.slice(p * VISIBLE, p * VISIBLE + VISIBLE);
    const dpr = window.devicePixelRatio || 1;
    void document.fonts.ready.then(() => {
      items.forEach(({ mood, layout }, i) => {
        const canvas = refs.current[i];
        if (!canvas) return;
        try {
          void renderCard(canvas, generatePalette(mood).palette, layout, "square", dpr);
        } catch {
          // a failed example must never break the tool page
        }
      });
    });
  }, []);

  useEffect(() => {
    drawSlice(0);
  }, [drawSlice]);

  // Redraw whenever the page changes — the canvases persist (stable keys), so
  // only their contents need repainting for the new slice.
  useEffect(() => {
    if (page !== 0) drawSlice(page);
  }, [page, drawSlice]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (pausedRef.current || !onscreenRef.current || document.hidden) return;
      setFaded(true);
      swapTimer.current = window.setTimeout(() => {
        // Compute next page OUTSIDE the updater: React may invoke updaters
        // twice (StrictMode) and treating them as pure is the contract. The
        // draw side effect runs once, from the effect below.
        setPage((p) => (p + 1) % PAGES);
        setFaded(false);
      }, FADE_MS);
    }, CYCLE_MS);
    return () => {
      window.clearInterval(id);
      if (swapTimer.current !== null) window.clearTimeout(swapTimer.current);
    };
  }, []);

  // Don't cycle for reduced-motion users; swap instantly instead.
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setInstantRef(true);
    return () => setInstantRef(false);

    function setInstantRef(v: boolean) {
      document.documentElement.style.setProperty("--gallery-fade-ms", v ? "0ms" : `${FADE_MS}ms`);
    }
  }, []);

  useEffect(() => {
    const el = refs.current[0]?.closest("[data-gallery]");
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        onscreenRef.current = entry.isIntersecting;
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      data-gallery
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <div
        className="grid w-full grid-cols-2 gap-4 md:grid-cols-4"
        style={{
          opacity: faded ? 0 : 1,
          transform: faded ? "translateY(6px)" : "translateY(0)",
          transition: `opacity var(--gallery-fade-ms, ${FADE_MS}ms) ease, transform var(--gallery-fade-ms, ${FADE_MS}ms) ease`,
        }}
        aria-live="off"
      >
        {slice.map(({ mood }, i) => (
          <Link
            key={i}
            href={`/capytone?mood=${encodeURIComponent(mood)}`}
            aria-label={`Open the card for ${mood}`}
            className="group block"
            tabIndex={faded ? -1 : 0}
          >
            <canvas
              ref={(el) => {
                refs.current[i] = el;
              }}
              width={1080}
              height={1080}
              className="aspect-square w-full rounded-xl border border-border transition-transform duration-300 group-hover:-translate-y-1"
            />
            <span className="mt-2 block text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground group-hover:text-foreground">
              {mood}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
