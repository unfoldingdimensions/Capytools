/**
 * The payload layer — pure string building, no DOM, no engine.
 *
 * Every schema here follows the ZXing wiki's Barcode Contents page, the
 * de-facto spec phone scanners actually implement. All four kinds encode as
 * byte mode in the engine; the builder's job is only to hand the engine an
 * exact, well-formed string. Where a field is missing that the schema cannot
 * do without, the builder returns a calm error instead of encoding something
 * no phone will parse.
 */

import type { PayloadFields, PayloadKind } from "./types";

export type PayloadResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

/**
 * The Wi-Fi schema escapes five characters with a backslash: `\`, `;`, `,`,
 * `:` and `"`. The backslash goes first, or the escapes themselves would
 * double up. Applies to the SSID and the password only — the other fields
 * come from fixed vocabularies and cannot carry the characters.
 */
export function escapeWifiValue(raw: string): string {
  return raw.replace(/([\\;,":])/g, "\\$1");
}

function vcard(fields: NonNullable<PayloadFields["contact"]>): PayloadResult {
  const first = fields.first.trim();
  const last = fields.last.trim();
  if (!first && !last) {
    return { ok: false, error: "a contact code needs a name — add a first or last name." };
  }
  const full = [first, last].filter(Boolean).join(" ");
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:${last};${first};;;`, `FN:${full}`];
  const org = fields.org?.trim();
  const phone = fields.phone?.trim();
  const email = fields.email?.trim();
  const url = fields.url?.trim();
  if (org) lines.push(`ORG:${org}`);
  if (phone) lines.push(`TEL:${phone}`);
  if (email) lines.push(`EMAIL:${email}`);
  if (url) lines.push(`URL:${url}`);
  lines.push("END:VCARD");
  return { ok: true, value: lines.join("\n") };
}

function wifi(fields: NonNullable<PayloadFields["wifi"]>): PayloadResult {
  const ssid = fields.ssid.trim();
  if (!ssid) {
    return { ok: false, error: "a Wi-Fi code needs a network name — add the SSID." };
  }
  const parts = [`T:${fields.encryption}`, `S:${escapeWifiValue(ssid)}`];
  if (fields.encryption !== "nopass") {
    parts.push(`P:${escapeWifiValue(fields.password)}`);
  }
  parts.push(`H:${fields.hidden ? "true" : "false"}`);
  return { ok: true, value: `WIFI:${parts.join(";")};;` };
}

function email(fields: NonNullable<PayloadFields["email"]>): PayloadResult {
  const to = fields.to.trim();
  if (!to) {
    return { ok: false, error: "an email code needs an address — add who it goes to." };
  }
  // RFC 6068 percent-encoding — a `+` in a mailto query arrives as a literal
  // plus, so URLSearchParams' `+`-for-space convention would corrupt subjects.
  const parts: string[] = [];
  if (fields.subject?.trim()) parts.push(`subject=${encodeURIComponent(fields.subject.trim())}`);
  if (fields.body?.trim()) parts.push(`body=${encodeURIComponent(fields.body.trim())}`);
  return { ok: true, value: parts.length > 0 ? `mailto:${to}?${parts.join("&")}` : `mailto:${to}` };
}

function link(fields: NonNullable<PayloadFields["link"]>): PayloadResult {
  const text = fields.text.trim();
  if (!text) {
    return { ok: false, error: "add a link or some text first — there is nothing to encode yet." };
  }
  return { ok: true, value: text };
}

const NOTHING_TO_ENCODE = "add a link or some text first — there is nothing to encode yet.";

/** Build the exact string the engine encodes, or say why it cannot. */
export function buildPayload(kind: PayloadKind, fields: PayloadFields): PayloadResult {
  switch (kind) {
    case "link":
      return fields.link ? link(fields.link) : { ok: false, error: NOTHING_TO_ENCODE };
    case "wifi":
      return fields.wifi
        ? wifi(fields.wifi)
        : { ok: false, error: "a Wi-Fi code needs a network name — add the SSID." };
    case "contact":
      return fields.contact
        ? vcard(fields.contact)
        : { ok: false, error: "a contact code needs a name — add a first or last name." };
    case "email":
      return fields.email
        ? email(fields.email)
        : { ok: false, error: "an email code needs an address — add who it goes to." };
  }
}
