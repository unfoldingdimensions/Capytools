/**
 * The idle posture, and the honest loader copy.
 *
 * There is no demo image on purpose: a placeholder bitmap would be a lie
 * about sizes, and CapyResize only ever speaks in real ones. The idle is
 * quiet copy — drop a file to start — and the loader names what is actually
 * happening, in order, with nothing invented between the steps.
 */

export const IDLE_HEADLINE = "drop an image here";

export const IDLE_HINT = "click to pick one, or paste — it never leaves this tab.";

export const LOADER_STEPS = ["reading", "decoding", "measuring"] as const;

export type LoaderStep = (typeof LOADER_STEPS)[number];
