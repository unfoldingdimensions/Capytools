const VIDEO = "/animations/capy-onsen.mp4";
const POSTER = "/animations/capy-onsen-poster.png";

/**
 * The resident capybara, soaking in the onsen — a calm 8s loop rendered in
 * Blender, framed as one more quiet little card. The video carries its own
 * warm paper background, so it sits the same way in both themes.
 */
export function CapyOnsen() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-border shadow-sm">
      {/* Decorative; the loop carries no information the page needs. */}
      <video
        className="block aspect-[3/2] w-full bg-[#f9f9f7] motion-reduce:hidden"
        src={VIDEO}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={POSTER}
        aria-hidden="true"
        tabIndex={-1}
      />
      {/* Reduced motion: the poster still, no autoplay. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- one-off decorative still behind a motion-reduce gate; the optimized path buys nothing here */}
      <img
        src={POSTER}
        alt=""
        loading="lazy"
        className="hidden aspect-[3/2] w-full object-cover motion-reduce:block"
        aria-hidden="true"
      />
      <p className="border-t border-border bg-card px-5 py-3 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        the resident capy · off duty
      </p>
    </div>
  );
}
