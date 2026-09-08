"use client";

import { useState } from "react";
import { WIRE } from "@/lib/capytools/landing";
import { TransitionLink } from "@/components/TransitionLink";

/**
 * The live wire — two counter-scrolling marquee rows (tool names, then the
 * engines each tool speaks). Tracks are rendered twice for a seamless -50%
 * loop. The marquee never stops on its own, so it ships with a
 * keyboard-reachable pause toggle (WCAG 2.2.2) and pauses on hover and while
 * tabbing through the engine links; reduced-motion kills the animation in
 * CSS and hides the toggle.
 */
export function LiveWire() {
  const [paused, setPaused] = useState(false);

  return (
    <section className="lp-wire" aria-label="The suite, live — tools and engines">
      <div className="lp-container lp-wire-inner">
        <div className="lp-wire-left">
          <span className="lp-wire-mark" aria-hidden="true">
            <span className="lp-wire-pulse" />
          </span>
          <span className="lp-wire-title">
            <b>{WIRE.title}</b>
            <span>{WIRE.sub}</span>
          </span>
          <button
            type="button"
            className={`lp-wire-pause${paused ? " is-paused" : ""}`}
            aria-pressed={paused}
            aria-label={paused ? "Play the live ticker" : "Pause the live ticker"}
            onClick={() => setPaused((p) => !p)}
          >
            <svg className="lp-glyph-pause" viewBox="0 0 10 10" aria-hidden="true">
              <rect x="1" width="3" height="10" />
              <rect x="6" width="3" height="10" />
            </svg>
            <svg className="lp-glyph-play" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M1 0l8 5-8 5z" />
            </svg>
            <span>{paused ? "Play" : "Pause"}</span>
          </button>
        </div>

        <div className={`lp-wire-rows${paused ? " is-paused" : ""}`}>
          {/* Decorative row — the real catalog lives in Labs below. */}
          <div className="lp-wire-row" aria-hidden="true">
            <div className="lp-marquee-track">
              {[0, 1].map((copy) => (
                <span key={copy} style={{ display: "inline-flex", gap: 36 }}>
                  {WIRE.tools.map((tool) => (
                    <span key={tool.name} className="lp-wire-item">
                      <span className="lp-wire-dot" aria-hidden="true">
                        ·
                      </span>
                      <span className="lp-wire-no">{tool.no}</span>
                      <span className="lp-wire-name">{tool.name}</span>
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>

          <div className="lp-wire-row lp-wire-row-reverse">
            <div className="lp-marquee-track">
              {[0, 1].map((copy) => (
                <span key={copy} style={{ display: "inline-flex", gap: 36 }} aria-hidden={copy === 1}>
                  {WIRE.engines.imagine.map((engine) => (
                    <TransitionLink
                      key={`imagine-${engine.handle}-${copy}`}
                      href={engine.href}
                      className="lp-wire-item"
                      tabIndex={copy === 1 ? -1 : undefined}
                    >
                      <span aria-hidden="true">·</span>
                      <span className="lp-wire-name">{engine.handle}</span>
                      <span className="lp-wire-role">engine</span>
                    </TransitionLink>
                  ))}
                  {WIRE.engines.creator.map((engine) => (
                    <TransitionLink
                      key={`creator-${engine.handle}-${copy}`}
                      href={engine.href}
                      className="lp-wire-item"
                      tabIndex={copy === 1 ? -1 : undefined}
                    >
                      <span aria-hidden="true">·</span>
                      <span className="lp-wire-name">{engine.handle}</span>
                      <span className="lp-wire-role">engine</span>
                    </TransitionLink>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
