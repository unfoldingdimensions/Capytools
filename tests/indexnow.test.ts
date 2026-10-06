import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const script = readFileSync(join(__dirname, "../scripts/indexnow.mjs"), "utf8");
const key = script.match(/const KEY = "([^"]+)"/)?.[1] ?? "";

describe("IndexNow key", () => {
  // Engines verify ownership by fetching /<key>.txt and comparing its body. A
  // key changed in one place and not the other answers 403 on every deploy.
  it("is a valid key, served from the site root with itself as the body", () => {
    expect(key).toMatch(/^[a-zA-Z0-9-]{8,128}$/);
    const file = join(__dirname, `../public/${key}.txt`);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf8")).toBe(key);
  });
});
