import { BRAND_BASE, BRAND_PATHS, BRAND_VIEWBOX } from "@/lib/capytools/brand-paths";
import { cn } from "@/lib/utils";

/**
 * The one brand mark, used by the masthead, the landing footer and the About
 * plate: the CT gear (the owner's final logo, 2026-10-10). It replaced the
 * traced capybara in a sage disc; the capybara lives on as the mascot
 * (`CapyMark`, `CapyArt`), not as the logo.
 *
 * Inlined rather than an <img> to `public/brand/logo.svg` deliberately: this
 * renders in the masthead of every page, above the fold, and an image request
 * would put a round trip and a flash of nothing in front of the header. The
 * geometry lives in `brand-paths.ts` so the inline copy and the file cannot
 * drift; a test pins them together.
 *
 * It does NOT inherit `currentColor` — it carries the brand's own two colours
 * (`--brand-ink` fills the gear, `--brand-disc` draws its lines), which swap in
 * dark mode so the gear reads on the charcoal canvas too.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("lp-brand-mark", className)} aria-hidden="true">
      <svg viewBox={BRAND_VIEWBOX} className="lp-brand-glyph">
        <path d={BRAND_BASE} fill="var(--brand-ink)" />
        {BRAND_PATHS.map((d) => (
          <path key={d.slice(0, 24)} d={d} fillRule="evenodd" fill="var(--brand-disc)" />
        ))}
      </svg>
    </span>
  );
}
