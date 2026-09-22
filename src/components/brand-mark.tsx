import { BRAND_PATHS, BRAND_VIEWBOX } from "@/lib/capytools/brand-paths";
import { cn } from "@/lib/utils";

/**
 * The one brand mark, used by the masthead, the landing footer and the About
 * plate.
 *
 * It used to be the landing's outlined seal with `CapyMark`'s line drawing
 * inside it, both explicitly placeholders. This is the real mark: the traced
 * capybara knocked out of a filled sage disc. The disc is part of the artwork
 * now, which is why `.lp-brand-mark` no longer draws a border — the ring and
 * the circle would otherwise sit one inside the other.
 *
 * Inlined rather than an <img> to `public/brand/logo.svg` deliberately: this
 * renders in the masthead of every page, above the fold, and an image request
 * would put a round trip and a flash of nothing in front of the header. The
 * geometry lives in `brand-paths.ts` so the inline copy and the file cannot
 * drift; a test pins them together.
 *
 * Unlike the old glyph it does NOT inherit `currentColor` — it carries the
 * brand's own two colours, so it reads the same on the cream canvas and the
 * charcoal one rather than inverting with its container.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("lp-brand-mark", className)} aria-hidden="true">
      <svg viewBox={BRAND_VIEWBOX} className="lp-brand-glyph">
        <circle cx="1000" cy="1000" r="1000" fill="var(--brand-disc)" />
        {BRAND_PATHS.map((d) => (
          <path key={d.slice(0, 24)} d={d} fillRule="evenodd" fill="var(--brand-ink)" />
        ))}
      </svg>
    </span>
  );
}
