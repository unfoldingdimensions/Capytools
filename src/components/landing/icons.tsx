/**
 * Shared inline SVGs for the editorial landing. The promise-card icons are
 * ported stroke-for-stroke from the OpenDesign export.
 */

export function ArrowUpRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M5 19L19 5M19 5H8M19 5v11" />
    </svg>
  );
}

/** The promise-card glyphs, keyed by the icon field in CAPABILITIES. */
export function PromiseIcon({ icon }: { icon: string }) {
  const common = {
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
    strokeWidth: 1.5,
  };

  switch (icon) {
    case "browser":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="14" rx="2" />
          <path d="M3.5 9h17M7 7h.01" />
        </svg>
      );
    case "privacy":
      return (
        <svg {...common}>
          <path d="M4 4l16 16" />
          <path d="M10.5 5.2A9 9 0 0 1 21 12a9 9 0 0 1-2.3 4.2M6.6 6.6A9 9 0 0 0 3 12a9 9 0 0 0 9 9 9 9 0 0 0 3.4-.7" />
        </svg>
      );
    default:
      return null;
  }
}
