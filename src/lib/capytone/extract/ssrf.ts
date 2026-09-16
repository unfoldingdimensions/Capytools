/**
 * The Extract route's SSRF gate — the part of Phase C that is load-bearing.
 *
 * This is the suite's first fetch-a-user-URL server route, so it carries the
 * full ordered stack from the plan (§7b.3): parse → IP-literal check → DNS
 * resolution of EVERY A and AAAA record → reserved-range validation. String
 * host checks alone are proven insufficient (DNS rebinding; the CVE that
 * motivated this design), so the hostname is resolved and every returned
 * address is range-checked before anything is fetched, and every redirect
 * hop runs the whole gauntlet again.
 *
 * The reserved-range table is the plan's §3.5 list, exactly:
 * 127/8, 0/8, 10/8, 172.16/12, 192.168/16, 169.254/16 (incl. the cloud
 * metadata endpoint), fc00::/7, fe80::/10, ::1, the IPv4-mapped ::ffff:0:0/96
 * (unwrapped and re-checked against the v4 table), 224/4 and ff00::/8 — plus
 * the unspecified address ::, which fails closed like every address this
 * module cannot confidently parse.
 */

import { isIP } from "node:net";

/** Why a target was refused before or instead of a fetch. */
export type BlockReason =
  | "bad_url" // not a URL this module can parse at all
  | "scheme" // not http/https
  | "port" // not the default, 80 or 443
  | "credentials" // userinfo in the URL (also defeats user@host confusion)
  | "blocked_host"; // IP literal in a reserved range, or a loopback name

export type TargetCheck = { ok: true; url: URL } | { ok: false; reason: BlockReason };

export type IpAddress = { kind: 4; v4: number } | { kind: 6; v6: Uint8Array };

/** Dotted-quad to a 32-bit number, strictly. WHATWG URL normalizes the
 * exotic decimal/hex/octal spellings before this ever sees them, so anything
 * left is canonical — and anything non-canonical is refused, not guessed. */
export function ipv4ToInt(text: string): number | null {
  const parts = text.split(".");
  if (parts.length !== 4) return null;
  let out = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    out = out * 256 + n;
  }
  return out >>> 0;
}

const EMBEDDED_V4_TAIL = /(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/;

/** IPv6 literal to 16 bytes, or null. Handles :: compression and an
 * embedded IPv4 tail (::ffff:127.0.0.1). Unparseable input stays null —
 * callers treat null as reserved (fail closed). */
export function ipv6ToBytes(text: string): Uint8Array | null {
  let s = text.toLowerCase();
  if (s.startsWith("[")) {
    if (!s.endsWith("]")) return null;
    s = s.slice(1, -1);
  }
  const zone = s.indexOf("%");
  if (zone !== -1) s = s.slice(0, zone);

  // An embedded dotted-quad tail names the last 32 bits — rewrite it as the
  // two hex groups it abbreviates, then parse like any other literal.
  const v4Tail = s.match(EMBEDDED_V4_TAIL);
  if (v4Tail) {
    const n = ipv4ToInt(v4Tail[1]);
    if (n === null) return null;
    const hi = (n >>> 16).toString(16);
    const lo = (n & 0xffff).toString(16);
    // The match's boundary colon is part of the match — keep it.
    s = s.slice(0, (v4Tail.index ?? 0) + 1) + `${hi}:${lo}`;
  }

  const halves = s.split("::");
  if (halves.length > 2) return null;
  const parseGroups = (side: string): (number | null)[] | null => {
    if (side === "") return [];
    const groups = side.split(":");
    const out: (number | null)[] = [];
    for (const g of groups) {
      if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
      out.push(parseInt(g, 16));
    }
    return out;
  };
  const head = parseGroups(halves[0]);
  const back = halves.length === 2 ? parseGroups(halves[1]) : [];
  if (!head || !back) return null;

  const bytes = new Uint8Array(16);
  const fill = (groups: (number | null)[], at: number): boolean => {
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (g === null) return false;
      bytes[at + i * 2] = g >> 8;
      bytes[at + i * 2 + 1] = g & 0xff;
    }
    return true;
  };
  if (halves.length === 2) {
    const gap = 8 - head.length - back.length;
    if (gap < 0) return null;
    if (!fill(head, 0)) return null;
    if (!fill(back, (head.length + gap) * 2)) return null;
  } else {
    if (head.length !== 8) return null;
    if (!fill(head, 0)) return null;
  }
  return bytes;
}

/** The plan's reserved-range table. One place, table-tested. */
export function isReservedIp(ip: IpAddress): boolean {
  if (ip.kind === 4) {
    const v = ip.v4;
    return (
      v <= 0x00ffffff || // 0.0.0.0/8 — "this network" (incl. 0.0.0.0)
      (v >= 0x0a000000 && v <= 0x0affffff) || // 10/8 — private
      (v >= 0x7f000000 && v <= 0x7fffffff) || // 127/8 — loopback
      (v >= 0xa9fe0000 && v <= 0xa9feffff) || // 169.254/16 — link-local, incl. 169.254.169.254
      (v >= 0xac100000 && v <= 0xac1fffff) || // 172.16/12 — private
      (v >= 0xc0a80000 && v <= 0xc0a8ffff) || // 192.168/16 — private
      v >= 0xe0000000 // 224/4 — multicast and everything after (240/4, broadcast)
    );
  }
  const b = ip.v6;
  const prefix = (n: number) => {
    for (let i = 0; i < n; i++) if (b[i] !== 0) return false;
    return true;
  };
  if (prefix(16)) return true; // :: unspecified
  if (prefix(15) && b[15] === 1) return true; // ::1 loopback
  if (b[0] === 0xfc || b[0] === 0xfd) return true; // fc00::/7 unique-local
  if (b[0] === 0xfe && b[1] >= 0x80 && b[1] <= 0xbf) return true; // fe80::/10 link-local
  if (b[0] === 0xff) return true; // ff00::/8 multicast
  // ::ffff:0:0/96 — IPv4-mapped. Unwrap and judge the embedded v4 address,
  // so ::ffff:127.0.0.1 is exactly as blocked as 127.0.0.1.
  if (prefix(10) && b[10] === 0xff && b[11] === 0xff) {
    const v4 = ((b[12] << 24) | (b[13] << 16) | (b[14] << 8) | b[15]) >>> 0;
    return isReservedIp({ kind: 4, v4 });
  }
  // ::/96 — the deprecated IPv4-compatible form: ::7f00:1 is ::127.0.0.1
  // written without the ffff prefix. Nothing legitimate has used this range
  // in decades, so the whole prefix fails closed regardless of the tail.
  if (prefix(12)) return true;
  // 64:ff9b::/96 — well-known NAT64 synthesis. Nothing on a serverless
  // network translates it, and an attacker's DNS has no business serving it.
  if (b[0] === 0x64 && b[1] === 0xff && b[2] === 0x9b) return true;
  return false;
}

/**
 * Pre-DNS host check: IP literals and loopback names. The WHATWG URL parser
 * has already normalized the confusing spellings (2130706433, 0x7f000001,
 * 0177.0.0.1, 127.1 → 127.0.0.1; ::ffff:127.0.0.1 → ::ffff:7f00:1), so one
 * canonical check catches the whole family — and anything that did NOT
 * normalize to an IP is a hostname, which gets the full DNS treatment next.
 */
export function isBlockedHostLiteral(hostname: string): boolean {
  let host = hostname.toLowerCase();
  // URL.hostname keeps the brackets on IPv6 literals; judge the address inside.
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  host = host.replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true; // RFC 6761
  const kind = isIP(host);
  if (kind === 4) {
    const v4 = ipv4ToInt(host);
    return v4 === null || isReservedIp({ kind: 4, v4 });
  }
  if (kind === 6) {
    const v6 = ipv6ToBytes(host);
    return v6 === null || isReservedIp({ kind: 6, v6 });
  }
  return false;
}

/**
 * Gate 1 — parse and pre-check a raw target before any I/O. Refuses
 * non-http(s) schemes, explicit odd ports, userinfo (which also defuses the
 * `http://example.com@127.0.0.1` confusion, since `example.com` lands in
 * username) and IP-literal/loopback hosts.
 */
export function validateTarget(raw: unknown): TargetCheck {
  if (typeof raw !== "string") return { ok: false, reason: "bad_url" };
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed.length > 2048) return { ok: false, reason: "bad_url" };
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, reason: "bad_url" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "scheme" };
  }
  if (url.port !== "" && url.port !== "80" && url.port !== "443") {
    return { ok: false, reason: "port" };
  }
  if (url.username !== "" || url.password !== "") {
    return { ok: false, reason: "credentials" };
  }
  if (url.hostname === "" || isBlockedHostLiteral(url.hostname)) {
    return { ok: false, reason: "blocked_host" };
  }
  return { ok: true, url };
}

/** The DNS dependency, injectable so the tests never touch a resolver. */
export interface HostResolver {
  resolve4(hostname: string): Promise<string[]>;
  resolve6(hostname: string): Promise<string[]>;
}

export type ResolveCheck =
  | { ok: true; addresses: string[] }
  | { ok: false; reason: "dns" | "blocked_host" };

/**
 * Gate 2 — resolve the hostname and validate EVERY A and AAAA record. Not
 * "any record may be public": every record must be public. A hostname whose
 * records are a mix of public and private is refused; one that resolves to
 * nothing at all is a dns failure. Unparseable records fail closed.
 */
export async function resolveAndCheck(
  url: URL,
  resolver: HostResolver,
): Promise<ResolveCheck> {
  // Belt for the braces: hop URLs were parsed from Location headers, so the
  // literal check runs again on every hop even though validateTarget just did.
  if (isBlockedHostLiteral(url.hostname)) return { ok: false, reason: "blocked_host" };

  const [v4, v6] = await Promise.allSettled([
    resolver.resolve4(url.hostname),
    resolver.resolve6(url.hostname),
  ]);
  const records = [
    ...(v4.status === "fulfilled" ? v4.value : []),
    ...(v6.status === "fulfilled" ? v6.value : []),
  ];
  if (records.length === 0) return { ok: false, reason: "dns" };

  for (const record of records) {
    const kind = isIP(record);
    const reserved =
      kind === 4
        ? (() => {
            const v4 = ipv4ToInt(record);
            return v4 === null || isReservedIp({ kind: 4, v4 });
          })()
        : kind === 6
          ? (() => {
              const v6 = ipv6ToBytes(record);
              return v6 === null || isReservedIp({ kind: 6, v6 });
            })()
          : true; // not an IP at all — refuse rather than guess
    if (reserved) return { ok: false, reason: "blocked_host" };
  }
  return { ok: true, addresses: records };
}
