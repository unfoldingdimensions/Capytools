/**
 * The idle card's teaching fixture.
 *
 * A short, realistic read of one scanned page — two tidy paragraphs and one
 * the engine wasn't sure about, marker included — assembled through the
 * SAME clean.ts the real run uses, so the demo can never drift from the
 * pipeline it demonstrates. No file, no worker, no download: it exists so
 * the words card explains itself before anyone drops anything.
 */

import type { RawParagraph } from "./types";
import { assembleParagraph, pageConfidence, paragraphsToText } from "./clean";
import type { OcrPageResult, OcrRunResult } from "./types";

const DEMO_PARAGRAPHS: RawParagraph[] = [
  [
    // 94 — a page of clean print.
    {
      words: [
        { text: "Invoice", confidence: 96 },
        { text: "no.", confidence: 95 },
        { text: "2026-014", confidence: 92 },
      ],
    },
    {
      words: [
        { text: "Two", confidence: 95 },
        { text: "hours", confidence: 94 },
        { text: "of", confidence: 97 },
        { text: "work", confidence: 93 },
        { text: "at", confidence: 96 },
        { text: "the", confidence: 95 },
        { text: "agreed", confidence: 91 },
        { text: "rate.", confidence: 89 },
      ],
    },
  ],
  [
    // 71 — a photocopy of a photocopy: real but visibly rougher.
    {
      words: [
        { text: "Payment", confidence: 78 },
        { text: "is", confidence: 82 },
        { text: "due", confidence: 74 },
        { text: "within", confidence: 69 },
        { text: "30", confidence: 77 },
        { text: "days.", confidence: 66 },
      ],
    },
    {
      words: [
        { text: "Please", confidence: 71 },
        { text: "quote", confidence: 68 },
        { text: "the", confidence: 75 },
        { text: "invoice", confidence: 64 },
        { text: "number.", confidence: 61 },
      ],
    },
  ],
  [
    // A date stamp on a diagonal — one word it genuinely could not read.
    {
      words: [
        { text: "RECEIVED", confidence: 58 },
        { text: "JAN", confidence: 38 },
        { text: "2026", confidence: 55 },
      ],
    },
  ],
];

function buildDemo(): OcrRunResult {
  const blocks: OcrPageResult["blocks"] = [];
  let unreadable = 0;
  for (const paragraph of DEMO_PARAGRAPHS) {
    const assembled = assembleParagraph(paragraph);
    if (!assembled) continue;
    blocks.push(assembled.block);
    unreadable += assembled.unreadable;
  }
  const page: OcrPageResult = {
    page: 1,
    blocks,
    text: paragraphsToText(blocks),
    confidence: pageConfidence(blocks),
    ms: 0,
    unreadable,
    rotation: 0,
    deskew: null,
  };
  return {
    pages: [page],
    text: page.text,
    confidence: page.confidence,
    lang: "eng",
    quality: "fast",
    ms: 0,
  };
}

export const DEMO_RUN: OcrRunResult = buildDemo();
