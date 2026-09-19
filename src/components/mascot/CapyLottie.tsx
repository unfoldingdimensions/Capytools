"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

import type { CapyHandle } from "@/lib/capytools/capy-player";
import { cn } from "@/lib/utils";

/**
 * The animated mascot.
 *
 * Everything here exists to keep a ~520 KiB player off the critical path:
 *
 * - The player and its WASM are imported ONLY once the canvas is near the
 *   viewport, so the landing's LCP never waits on them.
 * - The WASM is served from our own origin. dotlottie-web defaults to fetching
 *   it from jsdelivr/unpkg, which would make a visitor's browser contact a
 *   third party on a site whose entire promise is that nothing does.
 * - Under prefers-reduced-motion the state machine never starts. The handover
 *   is explicit that the capy must NOT be hidden — it is the brand mark — so
 *   it renders its held first frame instead.
 */
export function CapyLottie({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<CapyHandle | null>(null);
  const [near, setNear] = useState(false);
  const reduced = useReducedMotion();

  // Gate 1: don't even import the player until the canvas is close.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Gate 2: mount it.
  useEffect(() => {
    if (!near) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    (async () => {
      const [{ DotLottie }, { attachCapy }] = await Promise.all([
        import("@lottiefiles/dotlottie-web"),
        import("@/lib/capytools/capy-player"),
      ]);
      if (cancelled) return;

      DotLottie.setWasmUrl("/dotlottie-player.wasm");
      const dl = new DotLottie({ canvas, src: "/capy.lottie", autoplay: false });
      handleRef.current = attachCapy(dl, canvas, !reduced);
    })();

    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, [near, reduced]);

  return (
    <canvas
      ref={canvasRef}
      width={512}
      height={512}
      className={cn("h-auto w-full", className)}
      role="img"
      aria-label="A capybara, dozing"
    />
  );
}
