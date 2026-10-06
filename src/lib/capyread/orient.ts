/**
 * Orientation and skew, from the reads themselves.
 *
 * PURE — no canvas, no worker — so the whole module is unit-testable on
 * hand-built fixtures (tests/capyread.test.ts).
 *
 * Tesseract ships an orientation detector (osd.traineddata, +4.1 MB) and it
 * is famously flaky on sparse pages. CapyRead doesn't need it: a page at its
 * proper orientation reads with high confidence and plenty of words, and the
 * same page sideways or upside-down reads at almost nothing. The engine reads
 * at 0° and, only when the page reads poorly, tries the other three
 * quarter-turns and keeps the best — our own confidence is the detector, and
 * the tool says which turn it used. Fine skew (a phone photo a few degrees
 * off) is estimated from the confident words' baselines and corrected with
 * one extra pass.
 */

import type { RawParagraph } from "./types";

/** A page reading below this share of kept words is suspected of being turned. */
export const ROTATION_TRIGGER_RATIO = 0.5;

/** Attempts need at least this many words to count as "the page reads". */
export const MIN_READ_WORDS = 3;

/** A candidate orientation must clear this confidence to win. */
export const ROTATION_ACCEPT_CONFIDENCE = 70;

/** Below this, word baselines are noise — no deskew attempt. */
export const SKEW_TRIGGER_DEGREES = 0.75;

/** Past this the page isn't "slightly crooked" and re-reading is a gamble. */
export const SKEW_MAX_DEGREES = 12;

/** Only baselines this confident vote on the page's tilt. */
export const WORD_CONFIDENCE_FOR_SKEW = 70;

/** Deskew is a repair, not a ritual: a read this clean gains nothing from a
 *  second pass, and a sparse page's slope estimate is noisy enough to
 *  hallucinate a tilt that isn't there (measured: clean one-line pages
 *  "estimated" 1–3° and paid a full extra read for it). */
export const DESKEW_TRIGGER_CONFIDENCE = 85;

/** A degraded read is worth straightening and re-reading; a clean one
 *  already has all the accuracy there is. */
export function wantsDeskew(confidence: number | null, unreadable: number): boolean {
  return confidence === null || confidence < DESKEW_TRIGGER_CONFIDENCE || unreadable > 0;
}

/** One read attempt: the quarter-turn it was made at, what the engine earned. */
export interface ReadAttempt {
  /** Clockwise degrees applied to the page before this read: 0 | 90 | 180 | 270. */
  rotation: 0 | 90 | 180 | 270;
  /** Mean word confidence (0–100), null when nothing read. */
  confidence: number | null;
  /** Every word the engine saw, markers included. */
  words: number;
  /** How many of those fell below the unreadable threshold. On a page at the
   *  wrong quarter-turn the engine hallucinates whole lines of junk — the
   *  readable RATIO, not the mean, is what exposes it. */
  unreadable: number;
}

/** The share of words the engine actually stood behind, 0–1. */
export function readableRatio(attempt: ReadAttempt): number {
  if (attempt.words === 0) return 0;
  return (attempt.words - attempt.unreadable) / attempt.words;
}

/** Should the engine bother trying quarter-turns? A page at the wrong turn
 *  reads as mostly hallucinated junk — few of its words survive the
 *  unreadable threshold — while a merely rough page keeps most of them.
 *  A page with almost no words at all has no orientation to recover. */
export function needsRotation(attempt: ReadAttempt): boolean {
  return attempt.words >= MIN_READ_WORDS && readableRatio(attempt) < ROTATION_TRIGGER_RATIO;
}

/** The quarter-turn that reads best, or the original when nothing clears
 *  the bar. Candidates are scored by the readable ratio FIRST — tesseract
 *  reads upside-down print at deceptively high mean confidence, but only
 *  the true orientation keeps most of its words — with confidence as the
 *  tiebreak. Nothing clearing the bar leaves the original standing. */
export function attemptScore(attempt: ReadAttempt): number {
  return readableRatio(attempt) * 100 + (attempt.confidence ?? 0) / 2;
}

export function pickBestAttempt(first: ReadAttempt, rest: ReadAttempt[]): ReadAttempt {
  const candidates = [first, ...rest].filter((a) => a.words - a.unreadable >= MIN_READ_WORDS);
  let best = first;
  for (const attempt of candidates) {
    if (attemptScore(attempt) > attemptScore(best)) best = attempt;
  }
  // Nothing actually reads: the original orientation stands.
  if ((best.confidence ?? -1) < ROTATION_ACCEPT_CONFIDENCE) return first;
  return best;
}

/** The confident words' anchors: bottom-centre of each word's box. */
export function baselineAnchors(paragraphs: RawParagraph[]): Array<{ x: number; y: number }> {
  const anchors: Array<{ x: number; y: number }> = [];
  for (const paragraph of paragraphs) {
    for (const line of paragraph) {
      for (const word of line.words) {
        if (word.confidence < WORD_CONFIDENCE_FOR_SKEW || !word.bbox) continue;
        anchors.push({ x: (word.bbox.x0 + word.bbox.x1) / 2, y: word.bbox.y1 });
      }
    }
  }
  return anchors;
}

/**
 * The page's fine skew in degrees, estimated from word baselines.
 *
 * Per line, consecutive confident words give a slope; the median slope across
 * the page is the tilt. Positive means the text descends to the right (the
 * page was turned clockwise). Returns 0 when there aren't enough anchors —
 * fewer than two baselines is a guess, and CapyRead doesn't guess.
 */
export function estimateSkewDegrees(paragraphs: RawParagraph[]): number {
  const slopes: number[] = [];
  for (const paragraph of paragraphs) {
    for (const line of paragraph) {
      const anchors = line.words
        .filter((w) => w.confidence >= WORD_CONFIDENCE_FOR_SKEW && w.bbox)
        .map((w) => ({ x: (w.bbox!.x0 + w.bbox!.x1) / 2, y: w.bbox!.y1 }))
        .sort((a, b) => a.x - b.x);
      for (let i = 1; i < anchors.length; i++) {
        const dx = anchors[i].x - anchors[i - 1].x;
        if (dx < 8) continue; // near-vertical neighbours are noise
        slopes.push((anchors[i].y - anchors[i - 1].y) / dx);
      }
    }
  }
  if (slopes.length === 0) return 0;
  slopes.sort((a, b) => a - b);
  const median = slopes[Math.floor(slopes.length / 2)];
  return (Math.atan(median) * 180) / Math.PI;
}

/** The engine deskews only when the page is honestly crooked — past SKEW_MAX
 *  it isn't crooked, it's a different photo, and a re-read is a gamble. */
export function deskewCandidate(skewDegrees: number): number | null {
  if (Math.abs(skewDegrees) < SKEW_TRIGGER_DEGREES) return null;
  if (Math.abs(skewDegrees) > SKEW_MAX_DEGREES) return null;
  return Math.round(skewDegrees * 10) / 10;
}

/** The lower-confidence read of two, for choosing between a crooked pass and
 *  its straightened re-read. Null (nothing read) never beats a number. */
export function betterRead(a: { confidence: number | null; words: number }, b: { confidence: number | null; words: number }): boolean {
  return (b.confidence ?? -1) > (a.confidence ?? -1);
}
