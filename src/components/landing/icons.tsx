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

/** The four promise-card glyphs, keyed by the icon field in CAPABILITIES. */
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
    case "export":
      return (
        <svg {...common}>
          <path d="M12 4v10M8 10l4 4 4-4" />
          <path d="M5 19h14" />
        </svg>
      );
    case "engines":
      return (
        <svg {...common}>
          <path d="M4 12h3l2-6 4 12 2-6h5" />
        </svg>
      );
    default:
      return null;
  }
}

/** The colophon's one-glyph-per-tool marks, from the export's partner row. */
export function PartnerGlyph({ name }: { name: string }) {
  const common = {
    viewBox: "0 0 80 30",
    "aria-hidden": true as const,
    strokeWidth: 2,
  };

  switch (name) {
    case "CapyWrapped":
      return (
        <svg {...common}>
          <path d="M4 24l9-9 6 5 12-13" />
        </svg>
      );
    case "CapyImagine":
      return (
        <svg {...common}>
          <circle cx="20" cy="15" r="9" />
          <circle cx="20" cy="15" r="3" />
        </svg>
      );
    case "CapyCreator":
      return (
        <svg {...common}>
          <path d="M20 3l8 12-8 12-8-12z" />
          <circle cx="20" cy="15" r="2" />
        </svg>
      );
    case "CapyStrip":
      return (
        <svg {...common}>
          <path d="M10 5l20 20M30 5L10 25" />
          <circle cx="7" cy="27" r="2.5" />
          <circle cx="33" cy="27" r="2.5" />
        </svg>
      );
    case "CapyExpense":
      return (
        <svg {...common}>
          <path d="M13 3h14v24l-3.5-2-3.5 2-3.5-2-3.5 2z" />
          <path d="M17 9h6M17 14h6" />
        </svg>
      );
    case "CapyOG":
      return (
        <svg {...common}>
          <rect x="7" y="6" width="26" height="18" rx="3" />
          <path d="M12 19l5-6 4 5 3-3 4 4" />
        </svg>
      );
    case "CapyQR":
      return (
        <svg {...common}>
          <rect x="7" y="5" width="8" height="8" />
          <rect x="25" y="5" width="8" height="8" />
          <rect x="7" y="17" width="8" height="8" />
          <path d="M25 18v3M30 21v4M25 25h2" />
        </svg>
      );
    case "CapyResize":
      return (
        <svg {...common}>
          <path d="M8 22V8h14" />
          <path d="M32 12v14H18" />
        </svg>
      );
    case "CapyToken":
      return (
        <svg {...common}>
          <circle cx="14" cy="15" r="7" />
          <path d="M26 10h8M26 15h8M26 20h6" />
        </svg>
      );
    case "CapyPixel":
      return (
        <svg {...common}>
          <path d="M7 25h7v-7h7v-7h7V4h6" />
        </svg>
      );
    case "CapyTone":
      return (
        <svg {...common}>
          <path d="M7 15c4-9 8-9 12 0s8 9 13 0" />
        </svg>
      );
    // A tool with no mark of its own still gets one, rather than the blank
    // cell that eleven tools and five cases left in the partner row.
    default:
      return (
        <svg {...common}>
          <circle cx="20" cy="15" r="8" />
        </svg>
      );
  }
}
