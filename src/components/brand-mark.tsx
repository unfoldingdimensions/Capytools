import { CapyMark } from "@/components/mascot/CapyMark";
import { cn } from "@/lib/utils";

/**
 * The one brand mark, used by the masthead, the landing footer and the About
 * plate.
 *
 * It is the landing's seal (the circle, `.lp-brand-mark`) with the suite's own
 * drawing inside it instead of a letter. Before this there were two marks on
 * the site: a circle-`C` on the landing and the capybara on the tool pages, so
 * the logo changed shape as soon as you clicked into a tool.
 *
 * The circle and the glyph are both still placeholders — the real logotype is
 * still to be drawn — which is exactly why they live in one component: the
 * next revision is a change here and nowhere else. The glyph inherits
 * `currentColor`, so it themes with whatever contains it.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("lp-brand-mark", className)} aria-hidden="true">
      <CapyMark className="lp-brand-glyph" />
    </span>
  );
}
