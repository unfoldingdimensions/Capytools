import { describe, expect, it } from "vitest";

import { GET } from "../src/app/llms.txt/route";
import { SUITE } from "../src/lib/capytools/suite";
import { SITE_URL } from "../src/lib/utils";

/**
 * A stale llms.txt is worse than no llms.txt: it tells a model with confidence
 * that a tool does not exist. The point of these tests is that the file cannot
 * fall behind the registry without going red.
 */

async function text() {
  return GET().text();
}

describe("/llms.txt", () => {
  it("is served as plain text", () => {
    expect(GET().headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  });

  it("lists every tool in the registry, with an absolute URL", async () => {
    const body = await text();
    for (const tool of SUITE) {
      expect(body, tool.name).toContain(`## ${tool.name}`);
      expect(body, tool.name).toContain(`${SITE_URL}${tool.href}`);
    }
  });

  it("counts the suite rather than hard-coding it", async () => {
    expect(await text()).toContain(`suite of ${SUITE.length} small`);
  });

  it("points at nothing robots.txt disallows", async () => {
    // /api/* costs up to 55 upstream GitHub calls per hit and /u/<name> leads
    // straight back into it. Advertising either here would undo robots.ts.
    const body = await text();
    expect(body).not.toMatch(/capytools\.app\/api\//);
    expect(body).not.toMatch(/capytools\.app\/u\//);
  });

  it("ends with a dated line", async () => {
    expect((await text()).trimEnd()).toMatch(/\nLast updated: \d{4}-\d{2}-\d{2}\.$/);
  });
});
