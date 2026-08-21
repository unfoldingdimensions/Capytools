# Criteria Taxonomy — Skeleton (to be validated against research)

> Hypothesis list. Phase 4 (synthesis) will confirm, merge, split, and tag each
> category/option with engine applicability and a `sourceId`. Target: **200–400
> leaf options** across ~20–25 categories.

## Categories (provisional)

1. **Subject / main entity** — e.g. lone wanderer, futuristic city, mythical beast
2. **Action / pose / activity** — e.g. mid-stride, reaching, dormant
3. **Setting / environment** — e.g. neon alley, misty forest, empty station
4. **Time / era** — e.g. 1920s, far-future, prehistoric
5. **Art movement / style** — e.g. art nouveau, brutalism, vaporwave
6. **Medium / material** — e.g. oil painting, 35mm photo, clay, pixel art
7. **Artist reference** — e.g. Moebius, Klimt, Zaha Hadid (provenance-tagged)
8. **Lighting** — e.g. golden hour, volumetric, neon rim light
9. **Camera / lens** — e.g. 50mm, tilt-shift, macro, wide-angle
10. **Composition / framing** — e.g. rule of thirds, dutch angle, close-up
11. **Color palette** — e.g. muted earth tones, high-contrast monochrome
12. **Mood / atmosphere** — e.g. serene, ominous, whimsical
13. **Weather / natural atmosphere** — e.g. fog, snowfall, heat haze
14. **Texture / surface detail** — e.g. weathered, polished chrome, cracked
15. **Detail / render-quality boosters** — e.g. intricate, 8k, ultra-detailed
16. **Aspect ratio / format** — e.g. 16:9, square, portrait
17. **Negative space / minimalism** — e.g. lots of empty sky, centered subject
18. **Negative prompt (exclusions)** — e.g. no text, no blur, no watermark
19. **Motion / dynamics (video)** — e.g. slow drift, sudden burst, flowing
20. **Camera movement (video)** — e.g. dolly in, orbit, handheld
21. **Prompt weighting / emphasis** — e.g. strong focus, secondary detail
22. **Engine-specific params** — e.g. MJ --stylize, Flux guidance, Gemini structure

## Per-option record shape (for the DB)

```
{ value: string, tags: ("universal"|"MJ"|"Flux"|"Gemini"|"video"|...)[], sourceId: number, weight?: number }
```

## Open during synthesis
- Which categories overlap and should merge (e.g. 12 vs 13 vs 17)?
- How many options per category to hit the "hundreds" target?
- How to weight randomization (uniform vs curated)?
