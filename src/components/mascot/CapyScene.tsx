"use client";

import { useEffect, useState } from "react";
import { CAPY_POSE, HEAD_PIVOT, POSE_VIEWBOX } from "@/lib/capytools/mascot";
import { cn } from "@/lib/utils";

export type CapyPose = "loaf" | "friends" | "nap";

/** Cycle order and timing. Hold long, move slowly — this is the calm brand. */
const CYCLE: CapyPose[] = ["loaf", "friends", "nap"];
const HOLD_MS = 4200;
const SHIFT_MS = 900;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

interface Layer {
  transform: string;
  opacity: number;
}

/**
 * The three poses are the SAME drawing with different layer transforms — the
 * reference poses differ by addition (bird, steam) and by settling (body sinks,
 * head dips, eyes close), never by a change of silhouette. That is why nothing
 * here morphs a path: every transition is transform + opacity on a <g>, which
 * the compositor can handle and which needs no morphing library.
 */
const POSES: Record<CapyPose, { body: Layer; head: Layer; bird: Layer; steam: Layer; eyesClosed: boolean; water: Layer }> = {
  loaf: {
    body: { transform: "translate(0, 0) scaleY(1)", opacity: 1 },
    head: { transform: "rotate(0deg) translate(0, 0)", opacity: 1 },
    bird: { transform: "translate(0, -7px) scale(0.9)", opacity: 0 },
    steam: { transform: "translate(0, 4px)", opacity: 0 },
    water: { transform: "scaleX(1)", opacity: 0.55 },
    eyesClosed: false,
  },
  friends: {
    // Body unchanged: the bird and steam simply arrive.
    body: { transform: "translate(0, 0) scaleY(1)", opacity: 1 },
    head: { transform: "rotate(0deg) translate(0, 0)", opacity: 1 },
    bird: { transform: "translate(0, 0) scale(1)", opacity: 1 },
    steam: { transform: "translate(0, 0)", opacity: 0.75 },
    water: { transform: "scaleX(1)", opacity: 0.55 },
    eyesClosed: false,
  },
  nap: {
    // Settle: the loaf sinks a touch and the head tips down onto the water.
    body: { transform: "translate(0, 1.5px) scaleY(0.97)", opacity: 1 },
    head: { transform: "rotate(-4deg) translate(0, 1.5px)", opacity: 1 },
    bird: { transform: "translate(0, -7px) scale(0.9)", opacity: 0 },
    steam: { transform: "translate(0, 4px)", opacity: 0 },
    water: { transform: "scaleX(1.04)", opacity: 0.7 },
    eyesClosed: true,
  },
};

/**
 * Animated capybara scene. Cycles loaf → with-friends → nap unless `pose` pins
 * one (the error card holds the nap). Motion is CSS only; the global
 * `prefers-reduced-motion` guard in globals.css zeroes every duration, which
 * leaves the scene rendered and readable, just still.
 */
export function CapyScene({
  className,
  pose: pinned,
  title,
}: {
  className?: string;
  /** Pin a single pose instead of cycling. */
  pose?: CapyPose;
  /** Accessible name; omit for a purely decorative scene. */
  title?: string;
}) {
  const [index, setIndex] = useState(0);
  const pose = pinned ?? CYCLE[index];

  useEffect(() => {
    if (pinned) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % CYCLE.length), HOLD_MS);
    return () => clearInterval(id);
  }, [pinned]);

  const state = POSES[pose];
  const shift = `transform ${SHIFT_MS}ms ${EASE}, opacity ${SHIFT_MS}ms ${EASE}`;
  // rotate/scale need a defined box; fill-box keeps each layer's own centre.
  const layer = (l: Layer, origin = "center") => ({
    transform: l.transform,
    opacity: l.opacity,
    transition: shift,
    transformBox: "fill-box" as const,
    transformOrigin: origin,
  });

  return (
    <svg
      viewBox={POSE_VIEWBOX}
      fill="none"
      className={cn("overflow-visible", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {/* water — always present, drifting slowly */}
        <g style={layer(state.water)}>
          <g className="capy-drift">
            <path d={CAPY_POSE.water} strokeWidth="1.6" />
          </g>
        </g>

        {/* steam — only in the "friends" pose */}
        <g style={layer(state.steam)}>
          <g className="capy-steam">
            <path d={CAPY_POSE.steam} strokeWidth="1.6" opacity="0.8" />
          </g>
        </g>

        {/* body — breathes continuously */}
        <g style={layer(state.body)}>
          <g className="capy-breathe">
            <path d={CAPY_POSE.body} strokeWidth="2.6" />
          </g>
        </g>

        {/* head — its own hinge, so the nap can tip it */}
        <g style={layer(state.head, `${HEAD_PIVOT.x}px ${HEAD_PIVOT.y}px`)}>
          <path d={CAPY_POSE.head} strokeWidth="2.6" />
          <path d={CAPY_POSE.headEar} strokeWidth="2.4" />
          <path d={CAPY_POSE.muzzle} strokeWidth="1.6" opacity="0.75" />
          {/* Eyes cross-fade: small enough that a fade reads as a blink, unlike
              the body, where cross-fading outlines would double-expose. */}
          <path
            d={CAPY_POSE.eyeOpen}
            strokeWidth="2.2"
            className={pinned || state.eyesClosed ? undefined : "capy-blink-open"}
            style={{ opacity: state.eyesClosed ? 0 : 1, transition: shift }}
          />
          <path
            d={CAPY_POSE.eyeClosed}
            strokeWidth="2.2"
            className={pinned || state.eyesClosed ? undefined : "capy-blink-closed"}
            style={{ opacity: state.eyesClosed ? 1 : 0, transition: shift }}
          />
        </g>

        {/* bird — hops down into place for "friends" */}
        <g style={layer(state.bird, "bottom center")}>
          <path d={CAPY_POSE.bird} strokeWidth="2" />
        </g>
      </g>
    </svg>
  );
}
