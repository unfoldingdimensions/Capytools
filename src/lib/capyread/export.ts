/**
 * The files a run turns into: plain .txt and .docx.
 *
 * The .docx path is deliberately plain — default font, plain paragraphs —
 * because a hand-styled document is how exported text ends up looking
 * mangled in someone else's Word (plan §9.1.6). The `docx` library loads
 * lazily on the first export; nothing pays for it at page load.
 *
 * The paragraph split lives in `docxParagraphs`, pure and unit-tested: the
 * document gets exactly the paragraphs the words card shows.
 */

/** "scan.pdf" → "scan". The export prefixes `read-` (plan §5.4). */
export function baseName(original: string): string {
  const trimmed = original.replace(/\.[^.]+$/, "").trim();
  return trimmed || "page";
}

export function exportName(original: string, ext: "txt" | "docx"): string {
  return `read-${baseName(original)}.${ext}`;
}

export function buildTxtBlob(text: string): Blob {
  return new Blob([text], { type: "text/plain;charset=utf-8" });
}

/** The blank-line-separated paragraphs, trimmed, empties gone. */
export function docxParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export async function buildDocxBlob(text: string): Promise<Blob> {
  const { Document, Paragraph, Packer, TextRun } = await import("docx");
  const children = docxParagraphs(text).map(
    (paragraph) => new Paragraph({ children: [new TextRun(paragraph)] }),
  );
  // A document with no paragraphs at all is a corrupt file in Word — one
  // empty paragraph keeps it legal.
  return Packer.toBlob(
    new Document({ sections: [{ children: children.length > 0 ? children : [new Paragraph("")] }] }),
  );
}
