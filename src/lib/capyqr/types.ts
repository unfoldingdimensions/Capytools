/**
 * CapyQR's shared vocabulary: what gets encoded, how it is styled, and what
 * the guards and the proof scan hand back.
 *
 * Everything here is plain data — no React, no browser — so the payload
 * builder, the guards and the tests can all import it from anywhere.
 */

export type PayloadKind = "link" | "wifi" | "contact" | "email" | "tel" | "geo" | "event";

export interface PayloadFields {
  link?: { text: string };
  wifi?: { ssid: string; password: string; encryption: "WPA" | "WEP" | "nopass"; hidden: boolean };
  contact?: { first: string; last: string; org?: string; phone?: string; email?: string; url?: string };
  email?: { to: string; subject?: string; body?: string };
  tel?: { phone: string };
  geo?: { lat: string; long: string };
  event?: { title: string; start: string; end: string; location?: string };
}

export type EccLevel = "L" | "M" | "Q" | "H";

export type FrameShape = "band" | "banner" | "card" | "tab";

export interface FrameState {
  on: boolean;
  shape: FrameShape;
  /** The frame band's fill; the caption renders in the foreground color. */
  color: string;
  label: string;
  position: "top" | "bottom";
}

export const DEFAULT_FRAME: FrameState = {
  on: false,
  shape: "band",
  color: "#f9f9f7",
  label: "SCAN ME",
  position: "bottom",
};

export interface QrStyleState {
  dotType: "square" | "rounded" | "dots" | "classy" | "classy-rounded" | "extra-rounded";
  cornerSquareType: "square" | "dot" | "extra-rounded";
  cornerDotType: "square" | "dot";
  fg: { mode: "solid"; color: string } | { mode: "gradient"; gradientType: "linear" | "radial"; from: string; to: string; rotation: number }; // rotation in degrees
  bg: string; // hex, or "transparent"
  quietModules: number; // 0–6, default 4
  ecc: EccLevel; // default "Q"; auto "H" with logo (override warns)
  cornerColor: string | null; // null = follow fg
}
