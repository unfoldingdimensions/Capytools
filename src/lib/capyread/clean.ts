/**
 * Turning what tesseract saw into what a reader wants.
 *
 * PURE — no canvas, no worker, no browser API — so the whole module is
 * unit-testable on hand-built fixtures (tests/capyread.test.ts). The engine
 * hands over RawParagraphs (words with confidences, grouped like tesseract's
 * block → paragraph → line tree); this module hands back honest text:
 *
 * - words the engine is essentially guessing at (confidence below
 *   WORD_UNREADABLE) become an explicit [unreadable] marker — a plainly
 *   labelled gap, never a silently wrong word (plan §5.3);
 * - a word hyphenated across a line break is joined back together ("exam-
 *   ple" → "example"), the one typographic artefact every printed page has;
 * - each paragraph carries its mean confidence so the words card can badge
 *   it high / fair / unsure — never colour alone (production-invariants).
 */

import type { OcrBlock, OcrPageResult, RawLine, RawParagraph } from "./types";

/** At or below this word confidence, the engine is guessing — say so. */
export const WORD_UNREADABLE = 45;

/** The plain-text marker that replaces a below-threshold word. */
export const UNREADABLE_MARKER = "[unreadable]";

export type Bucket = "high" | "fair" | "unsure" | "none";

/** Mean confidence → the three words the badge shows. "none" is an empty page. */
export function confidenceBucket(mean: number | null): Bucket {
  if (mean === null) return "none";
  if (mean >= 85) return "high";
  if (mean >= 65) return "fair";
  return "unsure";
}

function cleanWords(line: RawLine): { words: string[]; confidences: number[]; unreadable: number } {
  const words: string[] = [];
  const confidences: number[] = [];
  let unreadable = 0;
  for (const word of line.words) {
    const text = word.text.replace(/\s+/g, "").trim();
    if (!text) continue;
    // Every word counts toward the mean, marked ones too: a paragraph of
    // nine [unreadable] and one clean word is not "high".
    confidences.push(word.confidence);
    if (word.confidence < WORD_UNREADABLE) {
      words.push(UNREADABLE_MARKER);
      unreadable += 1;
    } else {
      words.push(text);
    }
  }
  return { words, confidences, unreadable };
}

const isMarker = (word: string) => word === UNREADABLE_MARKER;

/** "exam-" + "ple" → true, a hyphenated break. A single-character dash, a
 *  dash after a marker, or a capital following ("well- Being") is punctuation,
 *  not a break, and stays as printed. Any lowercase letter, not just ASCII —
 *  "Grö-" + "ße" is German's everyday case. */
export function isHyphenBreak(lineEnd: string, nextStart: string): boolean {
  return (
    !isMarker(lineEnd) &&
    !isMarker(nextStart) &&
    lineEnd.length > 1 &&
    lineEnd.endsWith("-") &&
    /^\p{Ll}/u.test(nextStart)
  );
}

export interface AssembledParagraph {
  block: OcrBlock;
  unreadable: number;
}

/** One RawParagraph → one cleaned block. Empty in, null out. */
export function assembleParagraph(raw: RawParagraph): AssembledParagraph | null {
  const confidences: number[] = [];
  let unreadable = 0;
  const lines: string[][] = [];
  for (const line of raw) {
    const { words, confidences: lineConfidences, unreadable: lineUnreadable } = cleanWords(line);
    if (words.length === 0) continue;
    lines.push(words);
    confidences.push(...lineConfidences);
    unreadable += lineUnreadable;
  }
  if (lines.length === 0) return null;

  const joined: string[] = [];
  for (const words of lines) {
    const last = joined[joined.length - 1];
    if (last !== undefined && isHyphenBreak(last, words[0])) {
      joined[joined.length - 1] = last.slice(0, -1) + words[0];
      joined.push(...words.slice(1));
    } else {
      joined.push(...words);
    }
  }

  const text = joined.join(" ").trim();
  if (!text) return null;

  const confidence = confidences.length
    ? Math.round(confidences.reduce((sum, c) => sum + c, 0) / confidences.length)
    : 0;
  return { block: { text, confidence }, unreadable };
}

/** The page's text: paragraphs joined by one blank line. */
export function paragraphsToText(blocks: OcrBlock[]): string {
  return blocks.map((block) => block.text).join("\n\n");
}

/** Mean confidence over a page's paragraphs that actually read words. */
export function pageConfidence(blocks: OcrBlock[]): number | null {
  const withWords = blocks.filter((block) => block.confidence > 0);
  if (withWords.length === 0) return null;
  return Math.round(withWords.reduce((sum, block) => sum + block.confidence, 0) / withWords.length);
}

export function totalUnreadable(pages: OcrPageResult[]): number {
  return pages.reduce((sum, page) => sum + page.unreadable, 0);
}
