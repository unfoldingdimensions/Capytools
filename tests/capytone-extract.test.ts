/**
 * CapyTone Phase C — the Extract mode and its server route (plan §7 + §7b).
 *
 * Everything here is OFFLINE: resolvers, transports and stylesheet fetchers
 * are fakes, so the whole SSRF stack is table-tested without touching a
 * socket (§7b.4). The blocklist table is the §7b.6 merge-gate probe list:
 * IPv6-mapped forms, decimal/octal IP literals, rebinding-style hostnames,
 * parser-confusion URLs, redirect-to-private hops.
 */

import { describe, expect, it } from "vitest";

import {
  extractPalette,
  ExtractError,
  MAX_RESPONSE_BYTES,
} from "@/lib/capytone/extract";
import {
  fetchWithGuards,
  type FetchGuards,
  type Transport,
} from "@/lib/capytone/extract/fetchDoc";
import {
  extractFromCss,
  extractFromHtml,
  scanHtml,
} from "@/lib/capytone/extract/parse";
import {
  isReservedIp,
  ipv4ToInt,
  ipv6ToBytes,
  resolveAndCheck,
  validateTarget,
  type HostResolver,
} from "@/lib/capytone/extract/ssrf";
import {
  nearestStartStop,
  PALETTE_MAX,
  rankPalette,
} from "@/lib/capytone/extract/rank";

const okResolver: HostResolver = {
  resolve4: async () => ["93.184.216.34"],
  resolve6: async () => ["2606:2800:220:1:248:1893:25c8:1946"],
};

/** A transport serving one response, recording every URL it was asked for —
 * and every body it handed back, so teardown can be asserted. */
function fakeTransport(
  responses: Map<
    string,
    { status: number; contentType?: string; contentEncoding?: string; location?: string; chunks?: Uint8Array[] }
  >,
) {
  const requested: string[] = [];
  const bodies: { destroyed: boolean }[] = [];
  const transport: Transport = (url) => {
    requested.push(url.href);
    const hit =
      responses.get(url.href) ??
      responses.get(`${url.protocol}//${url.host}${url.pathname}`) ?? {
        status: 404,
        contentType: "text/plain",
      };
    const encoder = new TextEncoder();
    const chunks = hit.chunks ?? [encoder.encode("hello")];
    let sent = false;
    const record = { destroyed: false };
    bodies.push(record);
    return Promise.resolve({
      status: hit.status,
      contentType: hit.contentType ?? null,
      contentEncoding: hit.contentEncoding ?? null,
      location: hit.location ?? null,
      body: {
        destroy() {
          record.destroyed = true;
        },
        async *[Symbol.asyncIterator]() {
          if (sent) return;
          sent = true;
          for (const chunk of chunks) yield chunk;
        },
      },
      meta: undefined,
    });
  };
  return { transport, requested, bodies };
}

function guards(
  transport: Transport,
  overrides: Partial<FetchGuards> = {},
): FetchGuards {
  return {
    resolver: okResolver,
    transport,
    signal: AbortSignal.timeout(2_000),
    maxBytes: MAX_RESPONSE_BYTES,
    maxRedirects: 3,
    accept: ["text/html"],
    ...overrides,
  };
}

const encoder = new TextEncoder();
const text = (s: string) => [encoder.encode(s)];

describe("the reserved-range table (§3.5) — isReservedIp, one place", () => {
  const BLOCKED_V4 = [
    "0.0.0.0",
    "0.1.2.3",
    "10.0.0.1",
    "10.255.255.255",
    "100.64.0.1", // CGNAT (RFC 6598) — audit review addition
    "100.127.255.255",
    "127.0.0.1",
    "127.254.9.9",
    "169.254.169.254", // the cloud metadata endpoint, by name
    "169.254.1.1",
    "172.16.0.1",
    "172.31.255.254",
    "192.0.0.1", // IETF protocol assignments — audit review addition
    "192.0.2.1", // TEST-NET-1
    "192.168.1.254",
    "198.18.0.1", // benchmarking (RFC 2544) — passed BOTH gates before the fix
    "198.19.255.255",
    "198.51.100.1", // TEST-NET-2
    "203.0.113.1", // TEST-NET-3
    "224.0.0.1",
    "239.255.255.255",
    "255.255.255.255", // beyond 224/4 — refused, not guessed
  ];
  const PUBLIC_V4 = [
    "8.8.8.8",
    "1.1.1.1",
    "93.184.216.34",
    "172.32.0.1",
    "192.169.1.1",
    "100.0.0.1", // below CGNAT
    "100.128.0.1", // above CGNAT
    "192.0.1.1", // between 192.0.0/24 and TEST-NET-1
    "198.20.0.1", // above 198.18/15
    "203.0.114.1", // past TEST-NET-3
  ];

  it.each(BLOCKED_V4.map((ip) => [ip] as const))("blocks %s", (ip) => {
    expect(isReservedIp({ kind: 4, v4: ipv4ToInt(ip)! })).toBe(true);
  });
  it.each(PUBLIC_V4.map((ip) => [ip] as const))("allows %s", (ip) => {
    expect(isReservedIp({ kind: 4, v4: ipv4ToInt(ip)! })).toBe(false);
  });
  // Edges the arithmetic must not off-by-one: the last address of each
  // private range is inside it, the first address past it is not.
  it("holds the range edges exactly", () => {
    expect(isReservedIp({ kind: 4, v4: ipv4ToInt("172.31.255.255")! })).toBe(true);
    expect(isReservedIp({ kind: 4, v4: ipv4ToInt("172.32.0.0")! })).toBe(false);
    expect(isReservedIp({ kind: 4, v4: ipv4ToInt("9.255.255.255")! })).toBe(false);
    expect(isReservedIp({ kind: 4, v4: ipv4ToInt("11.0.0.0")! })).toBe(false);
    expect(isReservedIp({ kind: 4, v4: ipv4ToInt("126.255.255.255")! })).toBe(false);
    expect(isReservedIp({ kind: 4, v4: ipv4ToInt("128.0.0.1")! })).toBe(false);
    expect(isReservedIp({ kind: 4, v4: ipv4ToInt("169.253.255.255")! })).toBe(false);
    expect(isReservedIp({ kind: 4, v4: ipv4ToInt("223.255.255.255")! })).toBe(false);
  });

  it("blocks the deprecated ::/96 compatible form and NAT64 synthesis (review hardening)", () => {
    expect(isReservedIp({ kind: 6, v6: ipv6ToBytes("::7f00:1")! })).toBe(true); // ::127.0.0.1, no ffff
    expect(isReservedIp({ kind: 6, v6: ipv6ToBytes("::a9fe:809")! })).toBe(true); // ::169.254.8.9
    expect(isReservedIp({ kind: 6, v6: ipv6ToBytes("64:ff9b::7f00:1")! })).toBe(true);
    // even a public tail fails closed — the whole deprecated range is dead
    expect(isReservedIp({ kind: 6, v6: ipv6ToBytes("::808:808")! })).toBe(true); // ::8.8.8.8
  });

  it("treats the IPv4-mapped forms as their embedded v4 address", () => {
    const mapped = (v6: string) => {
      const bytes = ipv6ToBytes(v6);
      return bytes && isReservedIp({ kind: 6, v6: bytes });
    };
    // Dotted and hex spellings are the same bytes — both blocked like 127.0.0.1.
    expect(mapped("::ffff:127.0.0.1")).toBe(true);
    expect(mapped("::ffff:7f00:1")).toBe(true);
    expect(mapped("::ffff:169.254.169.254")).toBe(true);
    expect(mapped("::ffff:8.8.8.8")).toBe(false);
  });

  const BLOCKED_V6 = [
    "::1",
    "::",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "febf::1",
    "ff02::1",
    "2002::1", // 6to4 (deprecated) — audit review addition
    "2002:7f00:1::", // 6to4-wrapped loopback — the prefix fails closed
    "2001::1", // Teredo (deprecated)
    "2001::dead:beef",
  ];
  const PUBLIC_V6 = ["2606:4700::6810:84e5", "2001:db8::1", "2620:fe::fe", "2001:4860::1"];
  it.each(BLOCKED_V6.map((ip) => [ip] as const))("blocks %s", (ip) => {
    const bytes = ipv6ToBytes(ip);
    expect(bytes).not.toBeNull();
    expect(isReservedIp({ kind: 6, v6: bytes! })).toBe(true);
  });
  it.each(PUBLIC_V6.map((ip) => [ip] as const))("allows %s", (ip) => {
    const bytes = ipv6ToBytes(ip);
    expect(bytes).not.toBeNull();
    expect(isReservedIp({ kind: 6, v6: bytes! })).toBe(false);
  });

  it("fails closed on addresses it cannot parse", () => {
    const bytes = new Uint8Array(16);
    bytes[0] = 0x01; // a public-looking v6
    expect(isReservedIp({ kind: 6, v6: bytes })).toBe(false);
    // But unparseable literals never get this far — the callers treat a
    // null parse as reserved.
    expect(ipv6ToBytes("::ffff:999.1.1.1")).toBeNull();
    expect(ipv6ToBytes("1:2:3:4:5:6:7:8:9")).toBeNull();
    expect(ipv4ToInt("300.1.1.1")).toBeNull();
  });
});

describe("gate 1 — validateTarget, the §7b.4 blocklist table", () => {
  const ALLOWED = [
    "https://example.com",
    "http://example.com/page?with=query",
    "http://example.com:80/x",
    "https://example.com:443/x",
    "https://sub.domain.example.co.uk/deep/path",
  ];
  it.each(ALLOWED.map((url) => [url] as const))("allows %s", (url) => {
    const check = validateTarget(url);
    expect(check.ok, url).toBe(true);
  });

  const BLOCKED_HOSTS = [
    "http://127.0.0.1/",
    "http://127.254.9.9/",
    "http://10.1.2.3/",
    "http://172.16.0.9/",
    "http://192.168.0.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://0.0.0.0/",
    // audit review additions: the ranges 198.18/15 and friends that passed
    // BOTH gates (table + agent) before the table caught up
    "http://198.18.0.1/",
    "http://100.64.0.1/",
    "http://192.0.2.1/",
    "http://203.0.113.9/",
    "http://[2002::1]/",
    "http://[2001::1]/",
    "http://[::1]/",
    "http://[::]/",
    "http://[fc00::1]/",
    "http://[fe80::1]/",
    "http://[ff02::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:7f00:1]/",
    "http://localhost/",
    "http://LOCALHOST:80/",
    "http://api.localhost/",
    // WHATWG URL normalizes these decimal / hex / octal / short forms to
    // 127.0.0.1 before the literal check — the whole parser-confusion family.
    "http://2130706433/",
    "http://0x7f000001/",
    "http://0x7f.0x0.0x0.0x1/",
    "http://0177.0.0.1/",
    "http://127.1/",
  ];
  it.each(BLOCKED_HOSTS.map((url) => [url] as const))("blocks %s as a reserved host", (url) => {
    const check = validateTarget(url);
    expect(check).toEqual({ ok: false, reason: "blocked_host" });
  });

  const REFUSED: [string, "bad_url" | "scheme" | "port" | "credentials"][] = [
    ["not a url at all", "bad_url"],
    ["", "bad_url"],
    [123 as unknown as string, "bad_url"],
    ["ftp://example.com/file", "scheme"],
    ["javascript:alert(1)", "scheme"],
    ["data:text/html,hello", "scheme"],
    ["file:///etc/passwd", "scheme"],
    ["http://example.com:8080/", "port"],
    ["http://example.com:22/", "port"],
    ["https://example.com:8443/", "port"],
    ["http://user@example.com/", "credentials"],
    ["http://user:pw@example.com/", "credentials"],
    // Parser confusion: `example.com` is the USERNAME here — the host is
    // 127.0.0.1, and the credentials rule is what catches it.
    ["http://example.com@127.0.0.1/", "credentials"],
  ];
  it.each(REFUSED)("refuses %j with reason %s", (url, reason) => {
    expect(validateTarget(url)).toEqual({ ok: false, reason });
  });

  it("refuses header-injection shapes: control characters cannot reach a header", () => {
    // The URL is only ever re-serialized from its parsed form: WHATWG strips
    // raw CR/LF outright and percent-encodes what remains, so no request
    // path this route builds can carry a control byte into a header.
    const check = validateTarget("http://example.com/a\r\nX-Evil: 1");
    expect(check.ok).toBe(true);
    expect(check.ok && check.url.href).toBe("http://example.com/aX-Evil:%201");
    expect((check.ok && check.url.href) ?? "").not.toMatch(/[\r\n\t]/);
  });
});

describe("gate 2 — resolveAndCheck validates EVERY A and AAAA record", () => {
  const url = (host: string) => new URL(`http://${host}/`);

  it("passes when every record is public", async () => {
    const result = await resolveAndCheck(url("example.com"), {
      resolve4: async () => ["93.184.216.34", "93.184.216.35"],
      resolve6: async () => ["2606:2800:220:1:248:1893:25c8:1946"],
    });
    expect(result.ok).toBe(true);
  });

  it("blocks on one private record among public ones — no mixed blessing", async () => {
    const result = await resolveAndCheck(url("rebind.example"), {
      resolve4: async () => ["93.184.216.34", "10.0.0.5"],
      resolve6: async () => [],
    });
    expect(result).toEqual({ ok: false, reason: "blocked_host" });
  });

  it("blocks on a private AAAA even when all A records are clean", async () => {
    const result = await resolveAndCheck(url("v6rebind.example"), {
      resolve4: async () => ["93.184.216.34"],
      resolve6: async () => ["::ffff:127.0.0.1"],
    });
    expect(result).toEqual({ ok: false, reason: "blocked_host" });
  });

  it("reports dns when nothing resolves — fail closed", async () => {
    const result = await resolveAndCheck(url("gone.example"), {
      resolve4: async () => {
        throw new Error("NXDOMAIN");
      },
      resolve6: async () => {
        throw new Error("NXDOMAIN");
      },
    });
    expect(result).toEqual({ ok: false, reason: "dns" });
  });

  it("fails closed on a record that is not an IP at all", async () => {
    const result = await resolveAndCheck(url("lying.example"), {
      resolve4: async () => ["not-an-ip"],
      resolve6: async () => [],
    });
    expect(result).toEqual({ ok: false, reason: "blocked_host" });
  });

  it("re-checks IP-literal hostnames before resolving", async () => {
    let asked = false;
    const result = await resolveAndCheck(url("[::1]"), {
      resolve4: async () => {
        asked = true;
        return [];
      },
      resolve6: async () => [],
    });
    expect(result).toEqual({ ok: false, reason: "blocked_host" });
    expect(asked).toBe(false);
  });
});

describe("the guarded fetch — redirects, caps, content types (all fake-transport)", () => {
  it("fetches an html document and reports the final URL", async () => {
    const { transport, requested } = fakeTransport(
      new Map([
        [
          "https://example.com/",
          { status: 200, contentType: "text/html; charset=utf-8", chunks: text("<h1>hi</h1>") },
        ],
      ]),
    );
    const outcome = await fetchWithGuards(new URL("https://example.com/"), guards(transport));
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.doc.url).toBe("https://example.com/");
      expect(outcome.doc.text).toBe("<h1>hi</h1>");
    }
    expect(requested).toEqual(["https://example.com/"]);
  });

  it("follows relative and absolute redirects — re-resolving and re-validating each hop", async () => {
    const { transport, requested } = fakeTransport(
      new Map([
        [
          "https://example.com/old",
          { status: 302, location: "/redirected", contentType: "text/html" },
        ],
        [
          "https://example.com/redirected",
          { status: 301, location: "https://final.example.org/landing", contentType: "text/html" },
        ],
        [
          "https://final.example.org/landing",
          { status: 200, contentType: "text/html", chunks: text("<b>landed</b>") },
        ],
      ]),
    );
    const outcome = await fetchWithGuards(
      new URL("https://example.com/old"),
      guards(transport, {
        resolver: {
          resolve4: async (host) =>
            host === "final.example.org" ? ["93.184.216.34"] : ["93.184.216.34"],
          resolve6: async () => [],
        },
      }),
    );
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.doc.url).toBe("https://final.example.org/landing");
    expect(requested).toEqual([
      "https://example.com/old",
      "https://example.com/redirected",
      "https://final.example.org/landing",
    ]);
  });

  it("kills a redirect-to-private chain at hop 2 — the private host is never touched", async () => {
    const { transport, requested } = fakeTransport(
      new Map([
        [
          "https://example.com/jump",
          { status: 302, location: "http://169.254.169.254/latest/meta-data/", contentType: "text/html" },
        ],
      ]),
    );
    const outcome = await fetchWithGuards(
      new URL("https://example.com/jump"),
      guards(transport),
    );
    expect(outcome).toEqual({ ok: false, failure: "blocked_host" });
    // Hop 1 happened; the metadata endpoint was never requested.
    expect(requested).toEqual(["https://example.com/jump"]);
  });

  it("kills a redirect whose hop resolves private — the rebinding window, tested", async () => {
    const { transport } = fakeTransport(
      new Map([
        ["https://example.com/hop", { status: 302, location: "https://sneaky.example/", contentType: "text/html" }],
      ]),
    );
    // The public resolver says one thing; a rebinding resolver inside the
    // fetch would say another — every hop is re-resolved, so the fake
    // resolver flipping to private on the second lookup dies here.
    let lookups = 0;
    const outcome = await fetchWithGuards(
      new URL("https://example.com/hop"),
      guards(transport, {
        resolver: {
          resolve4: async () => (lookups++ === 0 ? ["93.184.216.34"] : ["192.168.0.9"]),
          resolve6: async () => [],
        },
      }),
    );
    expect(outcome).toEqual({ ok: false, failure: "blocked_host" });
  });

  it("tears down the body it refuses — a non-2xx never lingers", async () => {
    const { transport, bodies } = fakeTransport(
      new Map([["https://example.com/gone", { status: 404, contentType: "text/html" }]]),
    );
    const outcome = await fetchWithGuards(new URL("https://example.com/gone"), guards(transport));
    expect(outcome).toEqual({ ok: false, failure: "upstream" });
    expect(bodies[0]?.destroyed).toBe(true);
  });

  it("tears down bodies refused for content type and for lying about identity encoding", async () => {
    const { transport, bodies } = fakeTransport(
      new Map([
        ["https://example.com/plain", { status: 200, contentType: "text/plain" }],
        [
          "https://example.com/gzip",
          { status: 200, contentType: "text/html", contentEncoding: "gzip" },
        ],
      ]),
    );
    const notHtml = await fetchWithGuards(new URL("https://example.com/plain"), guards(transport));
    const encoded = await fetchWithGuards(new URL("https://example.com/gzip"), guards(transport));
    expect(notHtml).toEqual({ ok: false, failure: "not_html" });
    expect(encoded).toEqual({ ok: false, failure: "upstream" });
    expect(bodies.map((b) => b.destroyed)).toEqual([true, true]);
  });

  it("refuses to redirect past the hop limit (3 redirects → ok, 4 → failure)", async () => {
    const chain = (n: number) => {
      const responses = new Map<string, { status: number; location?: string; contentType?: string }>();
      for (let i = 0; i < n; i++) {
        responses.set(`https://example.com/${i}`, {
          status: 302,
          location: `/${i + 1}`,
          contentType: "text/html",
        });
      }
      responses.set(`https://example.com/${n}`, { status: 200, contentType: "text/html" });
      return responses;
    };
    const okRun = await fetchWithGuards(
      new URL("https://example.com/0"),
      guards(fakeTransport(chain(3)).transport),
    );
    expect(okRun.ok).toBe(true);

    const tooLong = await fetchWithGuards(
      new URL("https://example.com/0"),
      guards(fakeTransport(chain(4)).transport),
    );
    expect(tooLong).toEqual({ ok: false, failure: "too_many_redirects" });
  });

  it("stops reading past the byte cap and reports too_large — no partial body", async () => {
    const big = new Uint8Array(1_000);
    const { transport } = fakeTransport(
      new Map([
        [
          "https://example.com/big",
          { status: 200, contentType: "text/html", chunks: [big, big, big, big, big] },
        ],
      ]),
    );
    const outcome = await fetchWithGuards(
      new URL("https://example.com/big"),
      guards(transport, { maxBytes: 3_000 }),
    );
    expect(outcome).toEqual({ ok: false, failure: "too_large" });
  });

  it("enforces the content-type allowlist per fetch kind", async () => {
    const { transport } = fakeTransport(
      new Map([["https://example.com/img", { status: 200, contentType: "image/png" }]]),
    );
    const html = await fetchWithGuards(
      new URL("https://example.com/img"),
      guards(transport),
    );
    expect(html).toEqual({ ok: false, failure: "not_html" });

    const css = await fetchWithGuards(
      new URL("https://example.com/img"),
      guards(transport, { accept: ["text/css"] }),
    );
    expect(css).toEqual({ ok: false, failure: "not_html" });

    const cssOk = await fetchWithGuards(
      new URL("https://example.com/img"),
      guards(transport, { accept: ["text/css"] }),
    );
    expect(cssOk.ok).toBe(false);
  });

  it("refuses upstream error statuses", async () => {
    const { transport } = fakeTransport(
      new Map([["https://example.com/404", { status: 404, contentType: "text/html" }]]),
    );
    const outcome = await fetchWithGuards(
      new URL("https://example.com/404"),
      guards(transport),
    );
    expect(outcome).toEqual({ ok: false, failure: "upstream" });
  });

  it("distinguishes the clock from the wire when the transport dies", async () => {
    const never: Transport = async (_url, { signal }) => {
      await new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
      throw new Error("unreachable");
    };
    const timedOut = await fetchWithGuards(
      new URL("https://example.com/slow"),
      guards(never, { signal: AbortSignal.timeout(30) }),
    );
    expect(timedOut).toEqual({ ok: false, failure: "timed_out" });

    const refused: Transport = () => Promise.reject(new Error("ECONNREFUSED"));
    const network = await fetchWithGuards(
      new URL("https://example.com/dead"),
      guards(refused),
    );
    expect(network).toEqual({ ok: false, failure: "network" });
  });
});

describe("extractFromCss — css-tree walk, culori normalisation (fixture goldens)", () => {
  const FIXTURE_CSS = `:root {
  --brand: #8e9b7e;
  --accent: #C07952;
  --bg: white;
}
body {
  color: rgb(18, 18, 18);
  background: linear-gradient(to right, #f9f9f7 0%, transparent 100%);
  border: 1px solid rgba(0,0,0,0.15);
  font-family: "Sage Sans", serif;
  box-shadow: 0 1px 2px #121212;
  outline-color: hsl(90 15% 60% / 0.3);
}
a { color: currentColor; text-decoration-color: #5f7a7255 }
.hidden { color: rgba(0, 0, 0, 0); }
@media (prefers-color-scheme: dark) {
  body { background-color: oklch(0.32 0.02 145); color: #f0eee9; }
}
.mixed { color: color-mix(in srgb, #d9a441 60%, white); }`;

  const countsOf = (entries: { hex: string }[]) => {
    const counts = new Map<string, number>();
    for (const { hex } of entries) counts.set(hex, (counts.get(hex) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };

  it("reads every colour-bearing declaration, normalised to solid hex", () => {
    expect(countsOf(extractFromCss(FIXTURE_CSS, "stylesheet"))).toEqual([
      ["#000000", 1], // rgba(0,0,0,0.15) — alpha kept, flattened
      ["#121212", 2], // rgb(18, 18, 18) and the box-shadow hex
      ["#2d362d", 1], // oklch(0.32 0.02 145) — wide-gamut clamped into sRGB
      ["#5f7a72", 1], // #5f7a7255 — hex with alpha, flattened
      ["#8e9b7e", 1], // the custom property --brand
      ["#99a88a", 1], // hsl with 0.3 alpha
      ["#c07952", 1], // --accent, uppercase input normalised
      ["#d9a441", 1], // inside color-mix — culori can't parse the mix, the walk still finds the hex
      ["#f0eee9", 1], // nested inside @media
      ["#f9f9f7", 1], // a gradient stop
      ["#ffffff", 2], // named white (custom property) and color-mix's white
    ]);
  });

  it("drops transparent and alpha≈0 colours instead of flattening them", () => {
    // #00000002 is alpha 2/255 ≈ 0.008 — under the ≈0 line; #00000003 would
    // be 0.012 and stays.
    const hexes = extractFromCss(
      `.a { color: transparent; border-color: rgba(0, 0, 0, 0); outline-color: #00000002; } .b { color: #ffffff01; }`,
      "stylesheet",
    );
    expect(hexes).toEqual([]);
  });

  it("ignores non-colour identifiers, strings, var() and url() noise", () => {
    const hexes = extractFromCss(
      `.a { font-family: Sage, "inherit"; color: var(--mystery); list-style: none; background: url(paper.png); }`,
      "stylesheet",
    );
    expect(hexes).toEqual([]);
  });

  it("reads inline style attributes in declaration-list context", () => {
    const hexes = extractFromCss(
      "color:#c07952;background-image:linear-gradient(red, blue)",
      "inline",
      "declarationList",
    );
    expect(hexes.map((h) => h.hex).sort()).toEqual(["#0000ff", "#c07952", "#ff0000"]);
  });

  it("returns an empty list for malformed css, never a throw", () => {
    expect(extractFromCss("body { color: ", "stylesheet")).toEqual([]);
    expect(extractFromCss("{{{{{", "stylesheet")).toEqual([]);
  });

  it("degrades to a partial list when a pathological AST overflows the walk", () => {
    // Deep at-rule nesting css-tree's own parser survives — the old code
    // escaped as a RangeError and turned into a route 500.
    const deep = "@media all{".repeat(6_000) + "}".repeat(6_000);
    expect(() => extractFromCss(deep, "stylesheet")).not.toThrow();
  });
});

describe("scanHtml + extractFromHtml — meta, manifest, ≤5 stylesheets", () => {
  const FIXTURE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="theme-color" content="#8e9b7e">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#121212">
<meta name="description" content="colours and capybaras">
<link rel="stylesheet" href="/css/main.css">
<link rel="stylesheet" href="https://cdn.example.com/css/fonts.css">
<link rel="stylesheet" href="two.css">
<link rel="stylesheet" href="three.css">
<link rel="stylesheet" href="four.css">
<link rel="stylesheet" href="five.css">
<link rel="icon" href="/favicon.ico">
<link rel="manifest" href="/manifest.json">
<style>body { background: #abcdef; }</style>
</head>
<body style="color:#c07952;background-image:linear-gradient(red, blue)">
<main>hello</main>
</body>
</html>`;

  it("locates every signal: theme-color (with media), links, style blocks, inline styles", () => {
    const scan = scanHtml(FIXTURE_HTML, "https://example.com/pages/one");
    expect(scan.metaThemeColors).toEqual([
      { hex: "#8e9b7e", media: null, from: "meta" },
      { hex: "#121212", media: "(prefers-color-scheme: dark)", from: "meta" },
    ]);
    expect(scan.stylesheetHrefs).toEqual([
      "https://example.com/css/main.css",
      "https://cdn.example.com/css/fonts.css",
      "https://example.com/pages/two.css",
      "https://example.com/pages/three.css",
      "https://example.com/pages/four.css",
      "https://example.com/pages/five.css",
    ]);
    expect(scan.manifestHref).toBe("https://example.com/manifest.json");
    expect(scan.styleBodies).toEqual(["body { background: #abcdef; }"]);
    expect(scan.inlineStyles).toEqual(["color:#c07952;background-image:linear-gradient(red, blue)"]);
  });

  it("drops inline style values past the byte cap instead of parsing garbage for minutes", () => {
    const giant = `style="color:red" style=${"x".repeat(40_000)} style="color:blue"`;
    const scan = scanHtml(`<body ${giant}>`, "https://example.com/");
    expect(scan.inlineStyles).toEqual(["color:red", "color:blue"]);
  });

  it("fetches only the top five stylesheets and tolerates a failed one", async () => {
    const fetched: string[] = [];
    const page = await extractFromHtml(FIXTURE_HTML, "https://example.com/pages/one", {
      fetchStylesheet: async (href) => {
        fetched.push(href);
        if (href.endsWith("three.css")) return null; // one stylesheet 404s
        return { text: `.x { color: #5f7a72; }`, bytes: 22 };
      },
      fetchManifest: async (href) => {
        expect(href).toBe("https://example.com/manifest.json");
        return { name: "fixture", theme_color: "#5f7a72", background_color: "#f9f9f7" };
      },
    });

    // First five in document order; five.css is past the cap.
    expect(fetched).toEqual([
      "https://example.com/css/main.css",
      "https://cdn.example.com/css/fonts.css",
      "https://example.com/pages/two.css",
      "https://example.com/pages/three.css",
      "https://example.com/pages/four.css",
    ]);

    expect(page.themeColors).toEqual([
      { hex: "#8e9b7e", media: null, from: "meta" },
      { hex: "#121212", media: "(prefers-color-scheme: dark)", from: "meta" },
      { hex: "#5f7a72", media: null, from: "manifest" },
      { hex: "#f9f9f7", media: null, from: "manifest" },
    ]);
    expect(page.stats).toEqual({
      htmlBytes: expect.any(Number),
      styleBlocks: 1,
      inlineStyles: 1,
      stylesheetsFetched: 4,
      stylesheetsFailed: 1,
      stylesheetsSkipped: 1,
      cssBytes: 88,
      colourValues: 8, // #abcdef, #c07952, #ff0000, #0000ff + 4 stylesheet hexes
    });
    const hexes = page.occurrences.map((o) => o.hex);
    expect(hexes).toContain("#abcdef");
    expect(hexes).toContain("#5f7a72");
  });

  it("skips non-http hrefs instead of fetching them", () => {
    const scan = scanHtml(
      `<link rel="stylesheet" href="data:text/css,.a{color:red}"> <link rel="stylesheet" href="/ok.css">`,
      "https://example.com/",
    );
    expect(scan.stylesheetHrefs).toEqual(["https://example.com/ok.css"]);
  });

  it("stays correct on unclosed-tag floods — the shapes that made the old tag regexes O(n²)", () => {
    const flood = "<style ".repeat(50_000) + `<link rel="stylesheet" href="/ok.css">`;
    const scan = scanHtml(flood, "https://example.com/");
    expect(scan.styleBodies).toEqual([]);
    expect(scan.stylesheetHrefs).toEqual(["https://example.com/ok.css"]);
  });

  it("reads a style body across interleaved markup to the first closer, like the lazy regex did", () => {
    const scan = scanHtml(`<style>a{color:red}<p>x</style>`, "https://example.com/");
    expect(scan.styleBodies).toEqual(["a{color:red}<p>x"]);
  });

  it("ignores lookalike tags the old word-boundary rejected too", () => {
    const scan = scanHtml(
      `<stylex>a</stylex><metan name="theme-color" content="red"><linkified rel="stylesheet" href="/no.css">`,
      "https://example.com/",
    );
    expect(scan.styleBodies).toEqual([]);
    expect(scan.metaThemeColors).toEqual([]);
    expect(scan.stylesheetHrefs).toEqual([]);
  });
});

describe("rankPalette — frequency, CIEDE2000 clustering, the cap", () => {
  it("ranks by count and keeps a representative source", () => {
    const ranked = rankPalette([
      { hex: "#8e9b7e", source: "stylesheet" },
      { hex: "#8e9b7e", source: "stylesheet" },
      { hex: "#8e9b7e", source: "inline" },
      { hex: "#c07952", source: "inline" },
      { hex: "#121212", source: "stylesheet" },
    ]);
    expect(ranked.map((r) => r.hex)).toEqual(["#8e9b7e", "#121212", "#c07952"]);
    expect(ranked[0]).toEqual({ hex: "#8e9b7e", count: 3, source: "stylesheet" });
    // The count tie breaks on hex ascending.
    expect(ranked[1]).toEqual({ hex: "#121212", count: 1, source: "stylesheet" });
  });

  it("clusters near-duplicates into their most frequent member (ΔE00 ≤ 2.5)", () => {
    const ranked = rankPalette([
      { hex: "#fe0001", source: "stylesheet" }, // near-duplicate of the leader
      { hex: "#fe0000", source: "stylesheet" },
      { hex: "#fe0000", source: "stylesheet" },
      { hex: "#0000fe", source: "inline" }, // far away — its own cluster
    ]);
    expect(ranked).toEqual([
      { hex: "#fe0000", count: 3, source: "stylesheet" },
      { hex: "#0000fe", count: 1, source: "inline" },
    ]);
  });

  it("never returns more than 12 entries (the plan's top 8–12 ceiling)", () => {
    const many: { hex: string; source: string }[] = [];
    for (let i = 0; i < PALETTE_MAX + 6; i++) {
      // Distribute hues far apart so nothing clusters away.
      many.push({ hex: `hsl(${(i * 37) % 360} 80% 50%)`.replace("hsl", "x"), source: "stylesheet" });
    }
    // Build real hexes via culori-normalised input instead of fake strings.
    const spread: { hex: string; source: string }[] = [];
    for (let i = 0; i < PALETTE_MAX + 6; i++) {
      spread.push({
        hex: `#${Math.floor((i * 0xffffff) / (PALETTE_MAX + 5))
          .toString(16)
          .padStart(6, "0")}`,
        source: "stylesheet",
      });
    }
    void many;
    expect(rankPalette(spread)).toHaveLength(PALETTE_MAX);
  });

  it("is deterministic — same occurrences in, same palette out", () => {
    const entries = [
      { hex: "#8e9b7e", source: "stylesheet" },
      { hex: "#8e9b80", source: "stylesheet" },
      { hex: "#c07952", source: "inline" },
      { hex: "#121212", source: "stylesheet" },
      { hex: "#8e9b7e", source: "stylesheet" },
    ];
    expect(rankPalette(entries)).toEqual(rankPalette([...entries].reverse()));
  });
});

describe("nearestStartStop — the bridge into the Feel mode's stop-command flow", () => {
  it("maps the house sage to the sage stop", () => {
    expect(nearestStartStop("#8e9b7e")).toEqual({ phrase: "sage air", hex: "#A3B18A" });
  });

  it("maps near-black to a dusk-family stop, not a bright one", () => {
    const stop = nearestStartStop("#121212");
    expect(stop).not.toBeNull();
    expect(["storm night", "black pine", "plum night", "abyss tide", "deep ember"]).toContain(
      stop!.phrase,
    );
  });

  it("returns null for a colour it cannot read", () => {
    expect(nearestStartStop("nope")).toBeNull();
  });
});

describe("extractPalette — the orchestrator, end to end on fakes", () => {
  const PAGE_HTML = `<html>
<head>
<meta name="theme-color" content="#8e9b7e">
<link rel="stylesheet" href="/style.css">
<link rel="manifest" href="/manifest.json">
</head>
<body style="background:#f9f9f7;color:#121212">hi</body>
</html>`;

  const depsFor = () => {
    const { transport, requested } = fakeTransport(
      new Map([
        [
          "https://example.com/",
          { status: 200, contentType: "text/html", chunks: text(PAGE_HTML) },
        ],
        [
          "https://example.com/style.css",
          { status: 200, contentType: "text/css", chunks: text("body { color: #5f7a72; }") },
        ],
        [
          "https://example.com/manifest.json",
          {
            status: 200,
            contentType: "application/manifest+json",
            chunks: text('{"theme_color": "#5f7a72"}'),
          },
        ],
      ]),
    );
    return { transport, requested };
  };

  it("returns only counts, hexes and honest stats — and nothing else", async () => {
    const { transport } = depsFor();
    const result = await extractPalette("https://example.com", {
      resolver: okResolver,
      transport,
    });
    expect(result.url).toBe("https://example.com/");
    expect(result.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // Meta theme-color AND manifest theme_color, both routed to themeColors —
    // they are declared signals, never part of the ranked css palette.
    expect(result.themeColors).toEqual([
      { hex: "#8e9b7e", media: null, from: "meta" },
      { hex: "#5f7a72", media: null, from: "manifest" },
    ]);
    expect(result.palette).toEqual([
      // All three tie at count 1; the hex-ascending tie-break orders them.
      { hex: "#121212", count: 1, source: "inline" },
      { hex: "#5f7a72", count: 1, source: "stylesheet" },
      { hex: "#f9f9f7", count: 1, source: "inline" },
    ]);
    // The privacy promise, mechanically: hexes and numbers only.
    const json = JSON.stringify(result);
    expect(json).not.toContain("<html");
    expect(json).not.toContain("body style");
  });

  it("propagates typed failures for blocked targets", async () => {
    const { transport } = depsFor();
    await expect(
      extractPalette("http://169.254.169.254/", { resolver: okResolver, transport }),
    ).rejects.toMatchObject({ kind: "blocked_host" });
    await expect(
      extractPalette("ftp://example.com", { resolver: okResolver, transport }),
    ).rejects.toMatchObject({ kind: "scheme" });
    await expect(
      extractPalette("not a url", { resolver: okResolver, transport }),
    ).rejects.toMatchObject({ kind: "bad_url" });
  });

  it("throws no_colours when a page is genuinely colourless", async () => {
    const { transport } = fakeTransport(
      new Map([
        [
          "https://plain.example/",
          { status: 200, contentType: "text/html", chunks: text("<p>just words</p>") },
        ],
      ]),
    );
    const failure = await extractPalette("https://plain.example", {
      resolver: okResolver,
      transport,
    }).then(
      () => null,
      (error: unknown) => (error instanceof ExtractError ? error.kind : null),
    );
    expect(failure).toBe("no_colours");
  });

  it("stylesheets ride the same SSRF stack — a stylesheet redirect to a private host dies", async () => {
    const { transport } = fakeTransport(
      new Map([
        [
          "https://example.com/",
          {
            status: 200,
            contentType: "text/html",
            chunks: text(
              `<html><body style="background:#8e9b7e"><link rel="stylesheet" href="/redirecting.css"></body></html>`,
            ),
          },
        ],
        [
          "https://example.com/redirecting.css",
          {
            status: 302,
            contentType: "text/css",
            location: "http://192.168.1.1/secrets.css",
          },
        ],
      ]),
    );
    await expect(
      extractPalette("https://example.com/", { resolver: okResolver, transport }),
    ).resolves.toMatchObject({
      // The stylesheet was lost to the guard, but the page's own colours stand.
      palette: [{ hex: "#8e9b7e", count: 1, source: "inline" }],
    });
  });
});
