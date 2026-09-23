"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { ArrowUpRight } from "@/components/landing/icons";
import { TransitionLink } from "@/components/TransitionLink";
import { handoffHref } from "@/lib/capytools/handoff";
import { PROOF, type ProofDemoId } from "@/lib/capytools/landing";

import type { QrOutcome, QrStage, Swatch, TokenReadout } from "./proof-engines";

type Engines = typeof import("./proof-engines");

const DEMOS = PROOF.demos;
const IDS = DEMOS.map((demo) => demo.id) as ProofDemoId[];
const INPUT_DEBOUNCE_MS = 140;

/**
 * Requests to anything that could READ what was typed: another origin, or
 * our own `/api/`. The page fetching its own files (`/_next/`, plates, fonts)
 * is not one, and the band's own copy says so — the claim stays exactly as
 * wide as what this measures.
 *
 * Armed on the first keystroke, so the engines loading beforehand (disclosed
 * separately, in the tokens tab's own status line) are not mistaken for the
 * visitor's text going anywhere.
 */
function useServerRequests(armed: boolean): number | null {
  const [count, setCount] = useState(0);
  // Read on mount, not during render: the server has no PerformanceObserver,
  // so a render-time check would print "—" there and "0" here — a mismatch.
  const [supported, setSupported] = useState(false);
  const detect = useCallback(() => {
    setSupported(typeof PerformanceObserver !== "undefined");
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(detect, [detect]);

  useEffect(() => {
    if (!armed || !supported) return;
    const since = performance.now();
    const origin = window.location.origin;
    const observer = new PerformanceObserver((list) => {
      let found = 0;
      for (const entry of list.getEntries()) {
        if (entry.startTime < since) continue;
        const url = new URL(entry.name, origin);
        if (url.origin !== origin || url.pathname.startsWith("/api/")) found += 1;
      }
      if (found) setCount((n) => n + found);
    });
    observer.observe({ type: "resource", buffered: false });
    return () => observer.disconnect();
  }, [armed, supported]);

  return supported ? count : null;
}

/**
 * The landing's proof, in the hero's right column: CapyQR, CapyToken and
 * CapyTone running right there, above a counter watching for your text to
 * leave. It used to be its own band under the hero, behind a decorative plate
 * — "lean into proof", and the first screen led with a marble bust.
 *
 * Rotation is the brief's (auto-advance, owner's call) held to WCAG 2.2.2: it
 * only runs while the band is on screen, never under reduced motion, stops
 * for good the moment the visitor touches anything, and has a visible stop
 * control until then.
 *
 * Nothing heavy is in the landing bundle. The engines arrive through one
 * `import()` when the band nears the viewport, and the tokenizer's 1.1 MB only
 * when someone asks for a count — never because the rotation opened its tab.
 */
export function ProofBand() {
  const reduced = useReducedMotion();
  const band = useRef<HTMLDivElement>(null);
  const engines = useRef<Promise<Engines> | null>(null);
  const loadEngines = useCallback(() => (engines.current ??= import("./proof-engines")), []);

  const [near, setNear] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [active, setActive] = useState<ProofDemoId>(IDS[0]);
  const [touched, setTouched] = useState(false);
  const [armed, setArmed] = useState(false);
  const [values, setValues] = useState<Record<ProofDemoId, string>>(
    () => Object.fromEntries(DEMOS.map((demo) => [demo.id, demo.initial])) as Record<ProofDemoId, string>,
  );
  const requests = useServerRequests(armed);

  // Two thresholds: start loading a screen early, rotate only while visible.
  useEffect(() => {
    const node = band.current;
    if (!node) return;
    const early = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
      },
      { rootMargin: "400px 0px" },
    );
    const seen = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
      threshold: 0.35,
    });
    early.observe(node);
    seen.observe(node);
    return () => {
      early.disconnect();
      seen.disconnect();
    };
  }, []);

  const rotating = !touched && !reduced && onScreen;
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => {
      setActive((current) => IDS[(IDS.indexOf(current) + 1) % IDS.length]);
    }, PROOF.advanceMs);
    return () => window.clearTimeout(timer);
  }, [rotating, active]);

  const choose = (id: ProofDemoId) => {
    setTouched(true);
    setActive(id);
  };

  // Arrow keys move between tabs, Home/End jump — the tablist contract.
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const at = IDS.indexOf(active);
    const next =
      event.key === "ArrowRight"
        ? IDS[(at + 1) % IDS.length]
        : event.key === "ArrowLeft"
          ? IDS[(at - 1 + IDS.length) % IDS.length]
          : event.key === "Home"
            ? IDS[0]
            : event.key === "End"
              ? IDS[IDS.length - 1]
              : null;
    if (!next) return;
    event.preventDefault();
    choose(next);
    document.getElementById(`proof-tab-${next}`)?.focus();
  };

  const edit = (id: ProofDemoId, value: string) => {
    setTouched(true);
    setArmed(true);
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  return (
    // A region, not a <section>: it sits inside the hero's section, and the
    // hero is the first <section> the LCP test measures up to.
    <div
      ref={band}
      className="lp-proof-hero"
      id="proof"
      role="region"
      aria-labelledby="proof-heading"
      // Any pointer inside the band ends the rotation — reading counts too.
      onPointerDown={() => setTouched(true)}
    >
      <h2 id="proof-heading">
        {PROOF.headline.map((seg, i) =>
          seg.em ? <em key={i}>{seg.text}</em> : <span key={i}>{seg.text}</span>,
        )}
        <span className="lp-dot">.</span>
      </h2>
      <p className="lp-proof-lead">{PROOF.lead}</p>

        <div className="lp-proof-stage">
          <div className="lp-proof-bar">
            <div className="lp-proof-tabs" role="tablist" aria-label="Live demos">
              {DEMOS.map((demo) => (
                <button
                  key={demo.id}
                  id={`proof-tab-${demo.id}`}
                  type="button"
                  role="tab"
                  aria-selected={active === demo.id}
                  aria-controls={`proof-panel-${demo.id}`}
                  tabIndex={active === demo.id ? 0 : -1}
                  className="lp-proof-tab"
                  onClick={() => choose(demo.id)}
                  onKeyDown={onTabKey}
                >
                  {demo.tab}
                </button>
              ))}
            </div>
            {rotating ? (
              <button type="button" className="lp-proof-stop" onClick={() => setTouched(true)}>
                stop rotating
              </button>
            ) : null}
          </div>

          {DEMOS.map((demo) => (
            <div
              key={demo.id}
              id={`proof-panel-${demo.id}`}
              role="tabpanel"
              aria-labelledby={`proof-tab-${demo.id}`}
              className="lp-proof-panel"
              hidden={active !== demo.id}
            >
              <label className="lp-proof-field">
                <span>{demo.prompt}</span>
                {demo.id === "tokens" ? (
                  <textarea
                    rows={3}
                    value={values[demo.id]}
                    spellCheck={false}
                    onChange={(event) => edit(demo.id, event.target.value)}
                  />
                ) : (
                  <input
                    type="text"
                    value={values[demo.id]}
                    spellCheck={false}
                    autoComplete="off"
                    onChange={(event) => edit(demo.id, event.target.value)}
                  />
                )}
              </label>

              <div className="lp-proof-out">
                {demo.id === "qr" ? (
                  <QrDemo near={near} value={values.qr} load={loadEngines} />
                ) : demo.id === "tokens" ? (
                  <TokenDemo value={values.tokens} armed={armed} load={loadEngines} />
                ) : (
                  <PaletteDemo near={near} value={values.palette} load={loadEngines} />
                )}
              </div>

              <TransitionLink
                className="lp-proof-open"
                href={handoffHref(demo.open.href, values[demo.id])}
              >
                {demo.open.label}, with this
                <ArrowUpRight />
              </TransitionLink>
            </div>
          ))}

          {/* Shown by CSS only when the demos cannot run: scripting off, or a
              script that never hydrated (landing.css). Otherwise display:none. */}
          <p className="lp-proof-note lp-proof-failsafe">
            these demos run in your browser, and their script did not start. refresh
            the page to try again.
          </p>
        </div>

      <div className="lp-proof-counter" role="status" aria-live="polite">
        {/* "—" until the first keystroke arms it: a big 0 before anything was
            counted claimed a measurement that had not started. */}
        <span className="lp-proof-counter-n">{armed ? (requests ?? "—") : "—"}</span>
        <span className="lp-proof-counter-label">
          <b>{PROOF.counter.label}</b>
          {armed ? PROOF.counter.note : "starts counting when you type in any demo."}
        </span>
      </div>
      <a className="lp-proof-open lp-proof-source" href={PROOF.source.href}>
        {PROOF.source.label}
        <ArrowUpRight />
      </a>
    </div>
  );
}

/** Debounce a value, so an engine is not re-run on every keystroke. */
function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

function QrDemo({ near, value, load }: { near: boolean; value: string; load: () => Promise<Engines> }) {
  const host = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<QrStage | null>(null);
  const [failed, setFailed] = useState(false);
  const [outcome, setOutcome] = useState<QrOutcome | null>(null);
  const settled = useSettled(value, INPUT_DEBOUNCE_MS);

  useEffect(() => {
    if (!near || !host.current) return;
    let cancelled = false;
    load()
      .then((engines) => engines.startQr(host.current!))
      .then((ready) => !cancelled && setStage(ready))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [near, load]);

  useEffect(() => {
    if (!stage) return;
    let current = true;
    void stage.draw(settled).then((next) => current && setOutcome(next));
    return () => {
      current = false;
    };
  }, [stage, settled]);

  const drawn = outcome?.kind === "scanned";
  return (
    <div className="lp-proof-qr-wrap">
      <div className={`lp-proof-qr${drawn ? " is-drawn" : ""}`} ref={host} aria-hidden="true" />
      <p className="lp-proof-result" aria-live="polite">
        {failed ? (
          "the qr engine failed to load — refresh to try again."
        ) : !stage ? (
          "loading the qr engine into this tab…"
        ) : outcome?.kind === "empty" ? (
          "type a link to encode."
        ) : outcome?.kind === "too-long" ? (
          outcome.note
        ) : outcome?.kind === "scanned" && outcome.result.ok ? (
          <>
            <span className="lp-proof-chip">verified scannable</span>
            decoded “{outcome.result.data.length > 48 ? `${outcome.result.data.slice(0, 48)}…` : outcome.result.data}”
            {outcome.result.inverted ? " — inverted scanners only" : ""}, in this tab.
          </>
        ) : outcome?.kind === "scanned" ? (
          <span className="lp-proof-chip is-warn">does not scan</span>
        ) : (
          "drawing…"
        )}
      </p>
    </div>
  );
}

function TokenDemo({ value, armed, load }: { value: string; armed: boolean; load: () => Promise<Engines> }) {
  // The tokenizer is 1.1 MB. It loads on a real request — typing, or the
  // button — never because the rotation happened to open this tab.
  const [wanted, setWanted] = useState(false);
  const [readout, setReadout] = useState<TokenReadout | null>(null);
  const [failed, setFailed] = useState(false);
  const settled = useSettled(value, INPUT_DEBOUNCE_MS);
  const live = wanted || armed;

  useEffect(() => {
    if (!live) return;
    let current = true;
    load()
      .then((engines) => engines.countForProof(settled))
      .then((next) => current && setReadout(next))
      .catch(() => current && setFailed(true));
    return () => {
      current = false;
    };
  }, [live, settled, load]);

  if (!live) {
    return (
      <div className="lp-proof-tokens">
        <button type="button" className="lp-btn lp-btn-quiet lp-btn-sm" onClick={() => setWanted(true)}>
          count it here
        </button>
        <p className="lp-proof-result">loads the exact tokenizer into this tab — about 1.1 MB, once.</p>
      </div>
    );
  }

  return (
    <div className="lp-proof-tokens" aria-live="polite">
      {failed ? (
        <p className="lp-proof-result">the tokenizer failed to load — refresh to try again.</p>
      ) : readout ? (
        <>
          <p className="lp-proof-big">
            {readout.tokens}
            <small>tokens</small>
          </p>
          <p className="lp-proof-result">
            exact o200k count — {readout.cost} to send to {readout.model}, counted in this tab.
          </p>
        </>
      ) : (
        <p className="lp-proof-result">loading the tokenizer into this tab — about 1.1 MB, once…</p>
      )}
    </div>
  );
}

function PaletteDemo({ near, value, load }: { near: boolean; value: string; load: () => Promise<Engines> }) {
  const [swatches, setSwatches] = useState<Swatch[] | null>(null);
  const [note, setNote] = useState<string | undefined>();
  const settled = useSettled(value, INPUT_DEBOUNCE_MS);

  useEffect(() => {
    if (!near) return;
    let current = true;
    void load().then((engines) => {
      if (!current) return;
      const next = engines.paletteForProof(settled);
      setSwatches(next.swatches);
      setNote(next.note);
    });
    return () => {
      current = false;
    };
  }, [near, settled, load]);

  return (
    <div className="lp-proof-palette">
      <ol className="lp-proof-swatches" aria-label="Generated palette">
        {(swatches ?? Array.from({ length: 5 }, (_, i) => ({ role: `swatch ${i + 1}`, hex: "" }))).map((swatch) => (
          <li key={swatch.role}>
            <span
              className="lp-proof-swatch"
              style={swatch.hex ? { background: swatch.hex } : undefined}
              aria-hidden="true"
            />
            <span className="lp-proof-hex">{swatch.hex || "·"}</span>
            <span className="lp-proof-role">{swatch.role}</span>
          </li>
        ))}
      </ol>
      <p className="lp-proof-result" aria-live="polite">
        {swatches ? (
          <>
            {note ? `${note}. ` : ""}same phrase, same colours, every time.
          </>
        ) : (
          "loading the palette engine…"
        )}
      </p>
    </div>
  );
}
