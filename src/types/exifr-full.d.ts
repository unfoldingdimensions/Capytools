declare module "exifr/dist/full.esm.mjs" {
  /**
   * Ambient types for the prebundled browser build of exifr, which has no
   * type declarations at that subpath. Only the functions CapyStrip uses.
   */
  export interface ExifrGps {
    latitude: number;
    longitude: number;
  }

  const exifr: {
    parse(
      file: Blob,
      options?: Record<string, unknown>,
    ): Promise<Record<string, unknown> | undefined>;
    gps(file: Blob): Promise<ExifrGps>;
    thumbnail(file: Blob): Promise<Uint8Array | undefined>;
  };

  export default exifr;
}
