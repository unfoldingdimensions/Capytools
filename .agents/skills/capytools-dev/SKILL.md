---
name: capytools-dev
description: >-
  Guide and reference for developing, styling, and integrating tools into the Capytools ecosystem.
  Use when creating a new tool, adding features to existing tools (CapyWrapped, CapyImagine, CapyCreator),
  or styling components to adhere to Capytools design tokens, React 19 hydration rules, and privacy guarantees.
---

# Capytools Development & Design System Guide

Capytools is a calm suite of small, browser-native tools ("Small tools that run in your browser and keep nothing. No signup. No cookies. Nothing stored.").

## 1. Tool Creation Workflow

When adding a new tool to Capytools:

1. **Tool Identity**:
   - Route: `/capy<name>` (`src/app/capy<name>/page.tsx`).
   - Title & Eyebrow: `Capy<Name> · tool no. <N>` in `font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground`.
   - Heading: `font-display text-5xl font-light leading-[1.04] tracking-tight text-foreground sm:text-6xl` (Fraunces serif) with italic punchline.

2. **Client-Side Architecture**:
   - Tool component lives in `src/components/tool/<ToolName>.tsx` marked with `"use client"`.
   - Core computational logic lives in `src/lib/<name>/` and must run **100% in-browser**.
   - If optional API keys are needed, store them in `localStorage`.

3. **Homepage Registration**:
   - Add the tool object to `TOOLS` in `src/app/page.tsx`:
     ```ts
     {
       href: "/capy<name>",
       eyebrow: "tool no. <N>",
       name: "Capy<Name>",
       line: "<One-sentence calm summary.>",
     }
     ```
   - Update the grid columns if necessary (`sm:grid-cols-2 lg:grid-cols-3`).

4. **Testing**:
   - Add unit tests in `tests/<name>.test.ts` and run `npm test`.

---

## 2. Design System & Tokens

### Palette
- **Canvas**: Cream (`#f9f9f7`) light / Deep warm charcoal (`#121212`) dark.
- **Primary**: Sage (`--primary: #8e9b7e` light / `#9aab8d` dark).
- **Whisper Border**: `--border: #e7e4dd` light / `#2e2d2a` dark.
- **Accents**:
  - Warm Clay (`--clay: #c07952` / `#d68f66`): Required tags, critical boundaries, non-negotiables.
  - Water (`--water: #5f7a72` / `#7fa9a3`): Links, secondary focus, sparklines.
  - Gold (`--gold: #d9a441` / `#e3b25e`): Rare milestones, sparkles, frontier tier highlights.

### Typography
- **Headings**: `font-display` (`Fraunces`, 300 light, 400 italic).
- **Body & Inputs**: `font-sans` (`Plus Jakarta Sans`).
- **Eyebrows, Badges, Labels & Wells**: `font-mono` (`IBM Plex Mono`, uppercase tracking `[0.14em]` to `[0.24em]`).

### Structure & Radii
- Main Card Container: `rounded-3xl border border-border bg-card p-6 shadow-sm`.
- Inset Well / Code Box: `rounded-2xl border border-border/70 bg-muted/50 p-4 font-mono text-[13px]`.
- Controls / Pills: `rounded-full`.
- Always include `AmbientBackground` and `CapyMark` in layouts.

---

## 3. React 19 / Next.js 16 Hydration Guard

To avoid `react-hooks/set-state-in-effect` errors when reading `localStorage` or generating random seeds during client mount:

```tsx
// Hydrate stored values on client mount
const hydrateValues = useCallback(() => {
  setValue(getStoredValue());
}, []);

// eslint-disable-next-line react-hooks/set-state-in-effect
useEffect(hydrateValues, [hydrateValues]);
```

---

## 4. Multi-Provider LLM Polish Standard

When adding optional prompt polishing or text generation:
- Provide presets for **OpenCode-Go**, **OpenRouter**, **Nous Portal**, and **Command Code**.
- Persist settings in `localStorage` under `capy<name>_polish_settings`.
- Defensively strip reasoning tags (`stripThinkingTags` for `<think>...</think>`).
