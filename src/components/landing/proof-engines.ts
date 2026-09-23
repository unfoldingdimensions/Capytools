/**
 * The proof band's three engines — the SAME modules the tools run, adapted to
 * a small stage. No second copy of any engine lives here: CapyQR's renderer
 * and self-scan, CapyToken's tokenizer and price table, CapyTone's generator.
 *
 * This file is only ever reached through `import()` from ProofBand, so none of
 * it (qr-code-styling, jsQR, the palette lexicon) ships in the landing's first
 * bundle. The tokenizer is lazier still: `ensureEngine` pulls its ~1.1 MB of
 * ranks only when a visitor actually asks for a count.
 */

import { quietZonePx } from "@/lib/capyqr/guards";
import { capacityNote, moduleCountFor } from "@/lib/capyqr/matrix";
import { DEFAULT_STYLE } from "@/lib/capyqr/presets";
import { buildEngineOptions, createQrEngine } from "@/lib/capyqr/render";
import { verifyCanvas, type VerifyResult } from "@/lib/capyqr/verify";
import { costFor } from "@/lib/capytoken/compute";
import { countTokens, ensureEngine } from "@/lib/capytoken/engine";
import { formatCost, formatTokens } from "@/lib/capytoken/format";
import { CURATED_PRICES } from "@/lib/capytoken/prices";
import { generatePalette } from "@/lib/capytone/engine/generate";

/** The on-screen code, in CSS pixels. */
export const QR_SIZE = 200;
/** Same settle as CapyQR: let the engine paint before the scan reads it. */
const VERIFY_SETTLE_MS = 150;

export type QrOutcome =
  | { kind: "empty" }
  | { kind: "too-long"; note: string }
  | { kind: "scanned"; result: VerifyResult };

export interface QrStage {
  draw(value: string): Promise<QrOutcome>;
}

/** Mount CapyQR's engine into `host`; each draw re-renders, then self-scans. */
export async function startQr(host: HTMLElement): Promise<QrStage> {
  const engine = await createQrEngine();
  engine.mount(host);
  const style = DEFAULT_STYLE;

  return {
    async draw(value) {
      const text = value.trim();
      if (!text) return { kind: "empty" };
      const modules = moduleCountFor(text, style.ecc);
      if (modules === null) return { kind: "too-long", note: capacityNote(text, style.ecc) };
      engine.update(
        buildEngineOptions({
          value: text,
          size: QR_SIZE,
          style,
          quietPx: quietZonePx(QR_SIZE, modules, style.quietModules),
          logoUrl: null,
        }),
      );
      await new Promise((settle) => window.setTimeout(settle, VERIFY_SETTLE_MS));
      const canvas = host.querySelector("canvas");
      return {
        kind: "scanned",
        result: canvas instanceof HTMLCanvasElement ? verifyCanvas(canvas) : { ok: false },
      };
    },
  };
}

/** GPT-5 is priced exactly by o200k, so the one figure shown is not an estimate. */
const PRICED = CURATED_PRICES.find((row) => row.id === "gpt-5") ?? CURATED_PRICES[0];

export interface TokenReadout {
  tokens: string;
  cost: string;
  model: string;
}

/** Load the o200k ranks once (the 1.1 MB the UI discloses), then count. */
export async function countForProof(text: string): Promise<TokenReadout> {
  await ensureEngine("o200k");
  const n = (await countTokens(text, "o200k")) ?? 0;
  const usd = costFor(PRICED, n, 0).input;
  return {
    tokens: formatTokens(n),
    // A sentence costs a few millionths of a dollar; four decimals would
    // print "$0.0000", which reads as free rather than as tiny.
    cost: usd > 0 && usd < 0.0001 ? "under $0.0001" : formatCost(usd),
    model: PRICED.label,
  };
}

export interface Swatch {
  role: string;
  hex: string;
}

/** CapyTone's generator, reduced to its five colour roles. */
export function paletteForProof(phrase: string): { swatches: Swatch[]; note?: string } {
  const { palette, note } = generatePalette(phrase.trim() || "calm");
  return {
    swatches: [
      { role: "field", hex: palette.bg },
      { role: "mid", hex: palette.mid },
      { role: "accent", hex: palette.accent },
      { role: "surface", hex: palette.surface },
      { role: "ink", hex: palette.ink },
    ],
    note,
  };
}
