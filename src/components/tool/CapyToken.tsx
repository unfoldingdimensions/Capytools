"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Smile } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ErrorCard, type ErrorNotice } from "@/components/tool/ErrorCard";
import { StageCard, StageChip } from "@/components/stage-card";
import { COPIED_MS } from "@/lib/capytools/feedback";
import { chatOverhead, ruleOfThumb } from "@/lib/capytoken/estimate";
import { countTokens, ensureEngine } from "@/lib/capytoken/engine";
import { readHandoff } from "@/lib/capytools/handoff";
import { formatCost, formatPerM, formatTokens } from "@/lib/capytoken/format";
import { CURATED_PRICES, PRICES_SOURCE_COMMIT, PRICES_VERIFIED } from "@/lib/capytoken/prices";
import { costFor, contextFit, estimateLabelFor } from "@/lib/capytoken/compute";
import { DEMO_TEXT } from "@/lib/capytoken/demo";
import type { EstimateLabel, ModelPriceRow, TokenEncodingId } from "@/lib/capytoken/types";
import { cn } from "@/lib/utils";

/** One debounced count per text change — ranks parse is heavier than a keystroke. */
const COUNT_DEBOUNCE_MS = 150;

const ENCODINGS = [
  { id: "o200k" as const, name: "o200k_base" },
  { id: "cl100k" as const, name: "cl100k_base" },
];

const ENCODING_NAMES: Record<TokenEncodingId, string> = { o200k: "o200k_base", cl100k: "cl100k_base" };

/** The verdict paragraph and copy summary price the prompt at GPT-5 rates. */
const REFERENCE_MODEL_ID = "gpt-5";

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground";

/** The short chip text per honesty tier; the full sentences sit in the legend. */
const TIER_CHIP: Record<EstimateLabel["kind"], string> = {
  exact: "exact",
  "claude-estimate": "estimate",
  "unverified-estimate": "not verified",
};

const TIER_TONE: Record<EstimateLabel["kind"], "plain" | "clay" | "sage"> = {
  exact: "sage",
  "claude-estimate": "plain",
  "unverified-estimate": "plain",
};

/** The full estimate sentences, for the legend under the table. */
const ESTIMATE_LEGEND = (() => {
  const exemplars: Record<"claude-estimate" | "unverified-estimate", ModelPriceRow | undefined> = {
    "claude-estimate": CURATED_PRICES.find((row) => row.provider === "Anthropic"),
    "unverified-estimate": CURATED_PRICES.find(
      (row) => estimateLabelFor(row).kind === "unverified-estimate",
    ),
  };
  return {
    claude: exemplars["claude-estimate"] ? estimateLabelFor(exemplars["claude-estimate"]).text : "",
    unverified: exemplars["unverified-estimate"]
      ? estimateLabelFor(exemplars["unverified-estimate"]).text
      : "",
  };
})();

export function CapyToken() {
  const [text, setText] = useState("");
  // null = the ranks for that encoding have not been counted yet (first load).
  const [counts, setCounts] = useState<{ o200k: number | null; cl100k: number | null }>({
    o200k: null,
    cl100k: null,
  });
  const [engineLoading, setEngineLoading] = useState(false);
  const [error, setError] = useState<ErrorNotice | null>(null);
  const [overheadOn, setOverheadOn] = useState(false);
  const [plannedOutput, setPlannedOutput] = useState(512);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");
  const [retryAt, setRetryAt] = useState(0);

  const runId = useRef(0);

  // Arriving from the landing's proof band: the visitor's own text rides in
  // the URL fragment, which the browser never sends (lib/capytools/handoff).
  const hydrateHandoff = useCallback(() => {
    const text = readHandoff();
    if (text) setText(text);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(hydrateHandoff, [hydrateHandoff]);

  // One debounced count per text change. First use loads the ranks (~1 MB,
  // once) behind the honest loading chip; the singleton cache makes every
  // later count synchronous.
  useEffect(() => {
    const run = runId.current + 1;
    runId.current = run;
    const timer = window.setTimeout(() => {
      void (async () => {
        if (!text) {
          setCounts({ o200k: 0, cl100k: 0 });
          setEngineLoading(false);
          return;
        }
        let loadingShown = false;
        const counted = await Promise.all(
          ENCODINGS.map(async (encoding) => {
            const first = await countTokens(text, encoding.id);
            if (first !== null) return first;
            if (runId.current !== run) return null;
            if (!loadingShown) {
              loadingShown = true;
              setEngineLoading(true);
            }
            await ensureEngine(encoding.id);
            return countTokens(text, encoding.id);
          }),
        );
        if (runId.current !== run) return;
        setEngineLoading(false);
        setCounts({ o200k: counted[0], cl100k: counted[1] });
      })().catch(() => {
        if (runId.current !== run) return;
        setEngineLoading(false);
        setError({
          title: "the tokenizer didn't load.",
          body: "the rank files are part of the page, so this is a load hiccup, not a permission — one more try usually settles it. nothing you pasted went anywhere.",
          retry: true,
        });
      });
    }, COUNT_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [text, retryAt]);

  const retry = useCallback(() => {
    setError(null);
    setRetryAt((n) => n + 1);
  }, []);

  const overhead = overheadOn ? chatOverhead(1) : 0;
  const stats = useMemo(() => ruleOfThumb(text), [text]);

  const countFor = useCallback(
    (encoding: TokenEncodingId): number | null =>
      counts[encoding] === null ? null : (counts[encoding] as number) + overhead,
    [counts, overhead],
  );

  // The count each price row is quoted against: the row's own encoding when
  // this tool counts it exactly, o200k_base otherwise (the legend says so).
  const inputFor = useCallback(
    (row: ModelPriceRow): number | null =>
      row.encoding === "estimate" ? countFor("o200k") : countFor(row.encoding),
    [countFor],
  );

  const reference = useMemo(
    () => CURATED_PRICES.find((row) => row.id === REFERENCE_MODEL_ID) ?? CURATED_PRICES[0],
    [],
  );

  const readTokens = countFor("o200k");
  const read = useMemo(() => {
    if (readTokens === null) return null;
    const cost = costFor(reference, readTokens, plannedOutput);
    return { ...cost, perDollar: cost.total > 0 ? Math.round(1 / cost.total) : null };
  }, [reference, readTokens, plannedOutput]);

  const copySummary = useCallback(async () => {
    const o = countFor("o200k");
    const c = countFor("cl100k");
    if (o === null || c === null || read === null) return;
    const lines = [
      `CapyToken — ${ENCODING_NAMES.o200k}: ${formatTokens(o)} tokens · ${ENCODING_NAMES.cl100k}: ${formatTokens(c)} tokens`,
      `${reference.label}: ${formatCost(read.input)} in + ${formatCost(read.output)} out per call${read.perDollar ? ` — about ${formatTokens(read.perDollar)} calls per dollar` : ""}`,
      `prices verified ${PRICES_VERIFIED} · ${PRICES_SOURCE_COMMIT}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setStatus("copied the counts and the cost summary.");
      window.setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      setStatus("this browser blocked the copy — select the numbers by hand.");
    }
  }, [countFor, reference, read]);

  const trySample = useCallback(() => {
    setText(DEMO_TEXT);
    setStatus("sample loaded — the counts below are the demo's own.");
  }, []);

  return (
    <div className="flex w-full flex-col gap-5">
      {/* CARD 1: THE TEXT */}
      <StageCard index="01" title="The text" marks>
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="capytoken-text" className={labelClass}>
              your prompt
            </label>
            <button
              type="button"
              onClick={trySample}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              <Smile className="size-3" aria-hidden />
              try a sample
            </button>
          </div>
          <Textarea
            id="capytoken-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="paste the prompt you are about to send…"
            className="mt-1.5 min-h-40 field-sizing-content bg-muted/40 font-mono text-[13px]"
          />
          <p className="mt-1.5 text-[11px] tabular-nums text-muted-foreground">
            {formatTokens(text.length)} characters · {formatTokens(stats.byWords ? text.split(/\s+/).filter(Boolean).length : 0)}{" "}
            words
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {ENCODINGS.map((encoding) => {
              const tokens = countFor(encoding.id);
              return (
                <span
                  key={encoding.id}
                  className="inline-flex items-baseline gap-2 rounded-full border border-border bg-muted/30 px-3 py-1"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                    {encoding.name}
                  </span>
                  {tokens === null ? (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {engineLoading ? "loading tokenizer…" : "—"}
                    </span>
                  ) : (
                    <span className="font-mono text-[12px] tabular-nums text-foreground">
                      {formatTokens(tokens)} tokens
                    </span>
                  )}
                </span>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/30 px-3 py-2">
            <label htmlFor="capytoken-overhead" className={labelClass}>
              this is one chat message (+{chatOverhead(1)} framing tokens)
            </label>
            <Switch
              id="capytoken-overhead"
              checked={overheadOn}
              onCheckedChange={(v) => setOverheadOn(v === true)}
              aria-label="Add per-message framing tokens"
            />
          </div>
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground">
          exact for both OpenAI encodings — and a cross-check, OpenAI&apos;s own rule of thumb: ≈{" "}
          {formatTokens(stats.byChars)} tokens by characters (chars ÷ 4), ≈ {formatTokens(stats.byWords)}{" "}
          by words (words × ¾).{" "}
          {overheadOn ? "framing is added on top; OpenAI documents it for its own models only." : ""}
        </p>
      </StageCard>

      {/* CARD 2: THE PRICE */}
      <StageCard index="02" title="The price">
        <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <label htmlFor="capytoken-output" className={labelClass}>
              planned output (tokens)
            </label>
            <Input
              id="capytoken-output"
              type="number"
              min={0}
              max={1_000_000}
              value={plannedOutput}
              onChange={(e) => setPlannedOutput(Math.max(0, Math.round(Number(e.target.value) || 0)))}
              className="mt-1.5 w-36 bg-muted/40 font-sans tabular-nums"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            output is the reply you expect back — input and output share one window but carry separate
            caps.
          </p>
        </div>

        <div className="mt-4 max-h-96 overflow-y-auto rounded-2xl border border-border/70">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">model</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">in / 1M</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">out / 1M</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">input</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">output</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">total</th>
                <th scope="col" className="px-3 py-2 font-medium">window</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {CURATED_PRICES.map((row) => {
                const label = estimateLabelFor(row);
                const input = inputFor(row);
                const fit = contextFit(row, input ?? 0, plannedOutput);
                const cost = input === null ? null : costFor(row, input, plannedOutput);
                const band = fit.inputShare > 0.8;
                return (
                  <tr key={row.id} className="border-t border-border/60">
                    <td className="px-3 py-2">
                      <span className="font-medium text-foreground">{row.label}</span>{" "}
                      <span className="text-[11px] text-muted-foreground">{row.provider}</span>{" "}
                      <StageChip tone={TIER_TONE[label.kind]} className="ml-1 hidden md:inline-flex">
                        {TIER_CHIP[label.kind]}
                      </StageChip>
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{formatPerM(row.inputPerMTok * 1e-6)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{formatPerM(row.outputPerMTok * 1e-6)}</td>
                    <td className="px-3 py-2 text-right">{cost ? formatCost(cost.input) : "—"}</td>
                    <td className="px-3 py-2 text-right">{cost ? formatCost(cost.output) : "—"}</td>
                    <td className={cn("px-3 py-2 text-right font-medium", cost && "text-foreground")}>
                      {cost ? formatCost(cost.total) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {!fit.fitsInput ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--clay)]">
                          input over the window
                        </span>
                      ) : (
                        <span
                          className="inline-block h-1.5 w-20 overflow-hidden rounded-full bg-muted align-middle"
                          role="img"
                          aria-label={`input is ${Math.round(fit.inputShare * 100)}% of this model's ${formatTokens(row.maxInput)}-token window${fit.fitsTotal ? "" : " — input plus planned output is over the combined cap"}`}
                        >
                          <span
                            className={cn("block h-full rounded-full", band ? "bg-[var(--clay)]" : "bg-primary")}
                            style={{ width: `${Math.min(100, fit.inputShare * 100)}%` }}
                          />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
          <p>
            <span className="font-mono uppercase tracking-[0.1em]">exact</span> rows are counted in this
            tab. <span className="font-mono uppercase tracking-[0.1em]">estimate</span> — {ESTIMATE_LEGEND.claude}
          </p>
          <p>
            <span className="font-mono uppercase tracking-[0.1em]">not verified</span> — {ESTIMATE_LEGEND.unverified}
          </p>
          <p className="pt-1">
            prices verified {PRICES_VERIFIED} · source: LiteLLM model_prices ({PRICES_SOURCE_COMMIT})
          </p>
        </div>
      </StageCard>

      {/* CARD 3: THE READ */}
      <StageCard index="03" title="The read">
        {read && readTokens !== null ? (
          <>
            <p className="text-[15px] leading-relaxed text-foreground">
              your prompt is ~{formatTokens(readTokens)} tokens ({ENCODING_NAMES.o200k}
              {overheadOn ? `, including +${chatOverhead(1)} framing` : ""}). At {reference.label} rates
              that&apos;s {formatCost(read.input)} in + {formatCost(read.output)} out per call
              {read.perDollar ? ` — about ${formatTokens(read.perDollar)} calls per dollar` : ""}.
            </p>
            <p className="mt-2 text-[13px] text-muted-foreground">
              compare across the table above — the exact counts are OpenAI&apos;s encodings; every other
              row wears its own label.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button size="sm" className="min-w-[84px] rounded-full" onClick={() => void copySummary()}>
                {copied ? <Check className="mr-1.5 size-3.5" /> : <Copy className="mr-1.5 size-3.5" />}
                {copied ? "Copied" : "Copy summary"}
              </Button>
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {engineLoading ? "loading tokenizer…" : "the read appears once the text is counted."}
          </p>
        )}
        <p aria-live="polite" className="mt-3 min-h-5 text-center text-xs text-muted-foreground">
          {status}
        </p>
      </StageCard>

      {error ? (
        <ErrorCard title={error.title} body={error.body} onRetry={error.retry ? retry : undefined} />
      ) : null}
    </div>
  );
}
