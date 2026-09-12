/**
 * How long a transient confirmation stays.
 *
 * Four different numbers had accumulated for the same event: a "copied" tick
 * lasted 1500ms in three tools and 2200ms in a fourth, a settings confirmation
 * 3000ms, and the "paste the image" notice 4000ms. None of it was decided, it
 * was just typed once per component.
 *
 * Three meanings, three numbers:
 */
export const COPIED_MS = 2000;
export const CONFIRMED_MS = 3000;
export const NOTICE_MS = 4000;
