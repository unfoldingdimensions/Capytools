import { describe, expect, it } from "vitest";

import {
  organizationLd,
  softwareApplicationLd,
  webSiteLd,
} from "../src/lib/capytools/structured-data";
import { SUITE } from "../src/lib/capytools/suite";
import { SITE_URL } from "../src/lib/utils";

/**
 * Structured data is a claim made to machines that cannot check it, so the
 * things worth pinning are the ones a human would never notice going wrong:
 * a relative URL (meaningless to a crawler), a tool that quietly stops being
 * described, a price that stops being free, and CapyExpense claiming to run on
 * the Web when it is the suite's documented desktop exception.
 */

describe("homepage graph", () => {
  it("names the organization with absolute URLs and a stable @id", () => {
    const org = organizationLd();
    expect(org["@type"]).toBe("Organization");
    expect(org.url).toBe(`${SITE_URL}/`);
    expect(org["@id"]).toBe(`${SITE_URL}/#organization`);
    expect(org.sameAs.every((url) => url.startsWith("https://"))).toBe(true);
  });

  it("points the website at that same organization, by reference not by copy", () => {
    const site = webSiteLd();
    expect(site["@type"]).toBe("WebSite");
    expect(site.publisher).toEqual({ "@id": organizationLd()["@id"] });
  });
});

describe("every tool describes itself", () => {
  it("has a SoftwareApplication for each registry row, and none for a stranger", () => {
    for (const tool of SUITE) {
      expect(softwareApplicationLd(tool.name), tool.name).not.toBeNull();
    }
    expect(softwareApplicationLd("CapyNotATool")).toBeNull();
  });

  for (const tool of SUITE) {
    it(`${tool.name}: absolute url, free offer, honest platform`, () => {
      const ld = softwareApplicationLd(tool.name)!;
      expect(ld.url).toBe(`${SITE_URL}${tool.href}`);
      expect(ld.applicationCategory).toBe(tool.appCategory);
      expect(ld.offers.price).toBe("0");
      expect(ld.isAccessibleForFree).toBe(true);
      // The desktop exception must not claim the Web, and vice versa.
      expect(ld.operatingSystem).toBe(
        tool.cat === "desktop" ? "Windows, macOS, Linux" : "Web",
      );
      // ...nor claim it can be had today when it has no builds.
      expect(ld.offers.availability).toBe(
        tool.cat === "desktop"
          ? "https://schema.org/PreOrder"
          : "https://schema.org/InStock",
      );
    });
  }

  it("claims no ratings, because there are none to claim", () => {
    for (const tool of SUITE) {
      const ld = softwareApplicationLd(tool.name)! as Record<string, unknown>;
      expect(ld.aggregateRating).toBeUndefined();
      expect(ld.review).toBeUndefined();
    }
  });
});
