/**
 * CapyRead's shared shapes. The engine produces pages of paragraph blocks;
 * everything downstream (the words card, the exports, the breakdown) reads
 * from these, so the pipeline has one vocabulary.
 */

/** The model size a language is read with. Only English ships both. */
export type Quality = "fast" | "standard";

/** Where a run currently is — the words card labels the wait with it. */
export type OcrStage = "engine" | "language" | "reading";

export interface OcrProgress {
  stage: OcrStage;
  /** A lowercase house-voice sentence for the status line. */
  message: string;
  /** 0..1 when the stage reports one (reading a page), null when it can't. */
  progress: number | null;
}

/** One paragraph as tesseract saw it: words with their own confidence. */
export interface RawWord {
  text: string;
  confidence: number;
  /** The word's box in page pixels — the baseline deskew signal. */
  bbox?: { x0: number; y0: number; x1: number; y1: number };
}

export interface RawLine {
  words: RawWord[];
}

/** One tesseract paragraph — the unit CapyRead shows a badge for. */
export type RawParagraph = RawLine[];

/**
 * A cleaned paragraph: the text a reader gets plus the confidence the
 * engine earned. `bucket` is derived (format.ts), never stored by hand.
 */
export interface OcrBlock {
  text: string;
  confidence: number;
}

/** One page of one document. `page` starts at 1; a single image is page 1. */
export interface OcrPageResult {
  page: number;
  blocks: OcrBlock[];
  /** The cleaned text of the page, paragraphs joined by a blank line. */
  text: string;
  /** Mean word confidence across the page (0–100), null when nothing read. */
  confidence: number | null;
  ms: number;
  /** How many words were replaced by the unreadable marker. */
  unreadable: number;
  /** The clockwise quarter-turn the winning read was made at. */
  rotation: 0 | 90 | 180 | 270;
  /** Degrees of clockwise skew straightened before the winning read, null
   *  when the page wasn't deskewed. */
  deskew: number | null;
}

export interface OcrRunResult {
  pages: OcrPageResult[];
  /** Every page's text joined by a blank line — the copy/edit/export text. */
  text: string;
  /** Mean confidence across all read words, null when nothing read at all. */
  confidence: number | null;
  lang: string;
  quality: Quality;
  ms: number;
}
