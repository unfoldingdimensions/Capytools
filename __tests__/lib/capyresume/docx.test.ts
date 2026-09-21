import { buildResumeDocx } from '@/lib/capyresume/docx';
import { emptyResume } from '@/lib/capyresume/schema';
import { TEMPLATE_LIST } from '@/lib/capyresume/templates';
import { DEMO_RESUME } from '@/lib/capyresume/demo';

/** First bytes of a Blob, working with either the Node or the jsdom Blob */
async function firstBytes(blob: Blob, count = 2): Promise<string> {
  const candidate = blob as Blob & { arrayBuffer?: () => Promise<ArrayBuffer> };
  if (typeof candidate.arrayBuffer === 'function') {
    const bytes = new Uint8Array(await candidate.arrayBuffer());
    return String.fromCharCode(...bytes.slice(0, count));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const bytes = new Uint8Array(reader.result as ArrayBuffer);
      resolve(String.fromCharCode(...bytes.slice(0, count)));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

describe('capyresume/docx — render smoke', () => {
  it('produces a real .docx (zip container) rather than an empty blob', async () => {
    const blob = await buildResumeDocx(DEMO_RESUME);

    expect(blob.size).toBeGreaterThan(1000);
    // A .docx is an OOXML zip, so it must start with the zip magic "PK".
    expect(await firstBytes(blob)).toBe('PK');
  });

  it('renders the same content for every template', async () => {
    for (const spec of TEMPLATE_LIST) {
      const blob = await buildResumeDocx(DEMO_RESUME, { templateId: spec.id });
      expect(blob.size).toBeGreaterThan(1000);
    }
  });

  it('renders a blank résumé without throwing', async () => {
    const blob = await buildResumeDocx(emptyResume());
    expect(blob.size).toBeGreaterThan(0);
  });

  it('honours an explicit template over the document default', async () => {
    const serif = await buildResumeDocx(DEMO_RESUME, { templateId: 'serif' });
    const classic = await buildResumeDocx(DEMO_RESUME, { templateId: 'classic' });
    // Different fonts and rhythm => different bytes.
    expect(serif.size).not.toBe(classic.size);
  });

  it('accepts a paper-size option for symmetry with the PDF exporter', async () => {
    const blob = await buildResumeDocx(DEMO_RESUME, { paperSize: 'LETTER' });
    expect(blob.size).toBeGreaterThan(1000);
  });
});
