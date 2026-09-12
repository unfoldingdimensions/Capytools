/**
 * The favicon pack as data: every file the ZIP carries, each traced to a
 * primary source in docs/research/capyresize/implementation-plan.md §3.6.
 *
 * Four rasters the manifest names (apple 180, 192, 512, maskable 512), plus
 * the ICO's 16/32/48 frames and the two non-image files. The `<head>`
 * snippet ships as its own file, exactly the four lines a modern site needs —
 * and none of the cruft (msapplication tiles, mask-icon, "shortcut icon").
 */

export interface PackSpec {
  file: string;
  size: number;
  purpose: "any" | "maskable";
  /** Maskable and apple icons sit on an opaque fill; alpha would go black. */
  opaque: boolean;
}

export const PACK_SPECS: PackSpec[] = [
  { file: "apple-touch-icon.png", size: 180, purpose: "any", opaque: true },
  { file: "icon-192.png", size: 192, purpose: "any", opaque: true },
  { file: "icon-512.png", size: 512, purpose: "any", opaque: true },
  { file: "icon-maskable-512.png", size: 512, purpose: "maskable", opaque: true },
];

export const ICO_SIZES = [16, 32, 48] as const;

/** The maskable art box: the 40%-radius safe zone, restated as an 80% fit. */
export function maskableBox(size: number): number {
  return Math.round(size * 0.8);
}

/** The manifest, exact: every icon entry carries sizes and type, maskable separate. */
export function buildManifest(name: string, shortName: string): string {
  const manifest = {
    name,
    short_name: shortName,
    start_url: "/",
    display: "standalone",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/**
 * Every file the pack carries, in order — the one list the `<head>` block is
 * checked against.
 *
 * `favicon.svg` is a passthrough of the dropped file, so it exists only when
 * the source WAS an SVG. That is why the snippet below is a function of the
 * same flag and not a constant: it used to name favicon.svg unconditionally,
 * which sent anyone who dropped a PNG away with a link to a file the zip did
 * not contain.
 */
export function packFileNames(hasSvg: boolean): string[] {
  return [
    "favicon.ico",
    ...PACK_SPECS.map((spec) => spec.file),
    "manifest.webmanifest",
    "html-snippet.txt",
    ...(hasSvg ? ["favicon.svg"] : []),
  ];
}

/** The exact `<head>` block for this pack, shipped verbatim in html-snippet.txt. */
export function headSnippet(hasSvg: boolean): string {
  return [
    '<link rel="icon" href="/favicon.ico" sizes="32x32">',
    ...(hasSvg ? ['<link rel="icon" href="/favicon.svg" type="image/svg+xml">'] : []),
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/manifest.webmanifest">',
  ].join("\n");
}
