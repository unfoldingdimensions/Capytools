/**
 * Getting pixels ready for the reader.
 *
 * Images decode straight to a canvas (EXIF orientation honoured, by
 * CapyResize's decoder — one house decoder, not two). PDFs rasterise
 * page-by-page through pdf.js, only the pages the run will actually read,
 * each page's bitmap released before the next renders (plan §5.2: never the
 * whole PDF as one giant bitmap).
 *
 * pdf.js and its worker are loaded lazily here, on first use — the page
 * ships neither until a PDF is dropped. The worker file is served from this
 * origin (`/ocr/pdf/`), fetched by pdf.js itself; nothing in this module
 * issues a request of its own.
 */

import { decodeImage } from "@/lib/capyresize/render";
import type { RawParagraph } from "./types";

/**
 * The free run's page cap — ONE constant shared by the engine and the copy
 * (tests/capyread-boundaries.test.ts holds it to exactly one definition).
 * It is a feature, not a limit: a hundred-page scan is a memory bomb in a
 * tab, and the honest answer is to say so up front (plan §9.1.5).
 */
export const FREE_PAGE_LIMIT = 10;

/** Long edge a rasterised page aims for — roughly 200 dpi on A4, where
 *  tesseract reads print comfortably without an absurd canvas. */
const PDF_LONG_EDGE = 2000;

/** Long edge an image is downscaled to. Photos keep native pixels up to
 *  here; beyond it OCR gains nothing from the extra megapixels. */
const IMAGE_LONG_EDGE = 3000;

/** pdf.js renders at 72 dpi by default — A4 would be 842 px of mush. The
 *  scale is a rasterisation DPI choice, so upscaling is intended here;
 *  capped at 4× so a stub page can't ask for a 10k-px canvas. */
export function pdfScale(pageWidth: number, pageHeight: number): number {
  return Math.min(4, PDF_LONG_EDGE / Math.max(pageWidth, pageHeight));
}

/** Images only ever shrink — an upscaled photo adds blur, not information. */
export function imageScale(width: number, height: number): number {
  return Math.min(1, IMAGE_LONG_EDGE / Math.max(width, height));
}

/** The pure cap maths: how many of `total` pages a run reads, how many it
 *  reports skipping. Testable in node (no canvas involved). */
export function pagePlan(total: number): { render: number; skipped: number } {
  const render = Math.max(0, Math.min(total, FREE_PAGE_LIMIT));
  return { render, skipped: Math.max(0, total - render) };
}

export interface DecodedPage {
  page: number;
  canvas: HTMLCanvasElement;
}

/** An image file → one canvas. The only branch an image takes. */
export async function imageToCanvas(file: Blob): Promise<HTMLCanvasElement> {
  const { img, width, height } = await decodeImage(file);
  const scale = imageScale(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("this browser wouldn't give the page a canvas to decode onto.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** How many pages a PDF holds — cheap (no rendering), so the drop can warn
 *  about the cap before the run starts. */
export async function pdfPageCount(file: Blob): Promise<number> {
  const { doc, task } = await openPdf(file);
  const pages = doc.numPages;
  await task.destroy();
  return pages;
}

/** The loading task must outlive the document — in pdf.js v6 `destroy()`
 *  lives on the task, and it is what tears the worker down. */
async function openPdf(file: Blob) {
  const pdfjs = await import("pdfjs-dist");
  // The worker is served from this origin by the asset script; without this
  // line pdf.js would try to fake a worker on the main thread and stall runs.
  pdfjs.GlobalWorkerOptions.workerSrc = "/ocr/pdf/pdf.worker.min.mjs";
  const bytes = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({
    data: bytes,
    standardFontDataUrl: "/ocr/pdf/standard_fonts/",
  });
  return { task, doc: await task.promise };
}

/**
 * A PDF → its first `pagePlan`-worth of pages as canvases, one at a time.
 * `onPage` owns the canvas: OCR it, then let it go — this loop never holds
 * two rendered pages at once.
 */
export async function renderPdfPages(
  file: Blob,
  onPage: (page: DecodedPage) => Promise<void>,
  shouldStop?: () => boolean,
): Promise<void> {
  const { task, doc } = await openPdf(file);
  try {
    const plan = pagePlan(doc.numPages);
    for (let index = 1; index <= plan.render; index++) {
      if (shouldStop?.()) return;
      const page = await doc.getPage(index);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: pdfScale(base.width, base.height) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      // Scanned pages are images, but a PDF canvas starts transparent, and
      // black-on-nothing reads as black-on-black. White ground first.
      await page.render({ canvas, viewport, background: "#ffffff" }).promise;
      await onPage({ page: index, canvas });
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
}

/** Shape tesseract answers with — kept local so this module never imports
 *  the engine statically; engine.ts is the only file that loads it. */
export interface RawBlocks {
  data: {
    blocks: Array<{
      paragraphs: Array<{
        lines: Array<{
          words: Array<{ text: string; confidence: number }>;
        }>;
      }>;
    }> | null;
  };
}

/** tesseract's block tree → CapyRead's paragraphs (the clean.ts input). */
export function blocksToParagraphs(raw: RawBlocks["data"]["blocks"]): RawParagraph[] {
  if (!raw) return [];
  const paragraphs: RawParagraph[] = [];
  for (const block of raw) {
    for (const paragraph of block.paragraphs ?? []) {
      paragraphs.push(
        (paragraph.lines ?? []).map((line) => ({
          words: (line.words ?? []).map((word) => ({ text: word.text, confidence: word.confidence })),
        })),
      );
    }
  }
  return paragraphs;
}
