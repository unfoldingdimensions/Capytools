/**
 * The words under each tool: how to use it, what it does, and the questions
 * people actually type into a search box.
 *
 * MEASURED in Search Console: a tool page was a headline, one lead line and a
 * client-rendered widget — almost no text a crawler could read, so nothing for
 * "remove exif data from photo" to match. This is that text, rendered on the
 * server by `ToolPageShell` below the stage.
 *
 * Kept OUT of `SUITE` on purpose: the masthead's client bundle imports the
 * registry, and none of this prose belongs in it. A tool without an entry
 * here simply renders no guide.
 *
 * Every claim must be true of the code. These describe CapyStrip's encode
 * matrix (`src/lib/capystrip/clean.ts`) and CapyBg's model registry
 * (`src/lib/capybg/models.ts`) — change those, re-read these.
 */

export type ToolGuide = {
  /** The section's H2 — phrased the way the search is. */
  heading: string;
  /** Ordered steps for the "how to" list. */
  steps: readonly string[];
  /** Short "what it does" paragraphs. */
  about: readonly string[];
  faq: readonly { q: string; a: string }[];
};

export const TOOL_GUIDES: Readonly<Record<string, ToolGuide>> = {
  CapyStrip: {
    heading: "How to remove EXIF metadata from a photo",
    steps: [
      "Drop, paste or pick a photo — JPEG, PNG, WebP, AVIF, HEIC or TIFF.",
      "Read the report: GPS location, camera and phone model, serial numbers, timestamps, editing software and AI-generation fingerprints, each flagged when it can identify you.",
      "Download the clean copy. CapyStrip redraws the image, then re-scans its own output to prove nothing survived.",
    ],
    about: [
      "Every photo a phone takes carries a small file of facts about itself: where it was taken, on which device, and when. Post it as-is and anyone who downloads it can read that GPS position. CapyStrip shows you all of it before removing it.",
      "It also reads the fingerprints AI image tools leave behind — Stable Diffusion and ComfyUI prompts in PNG text chunks, NovelAI recipes, IPTC digital-source declarations and C2PA content credentials.",
      "The image is decoded and drawn onto a fresh canvas, which carries no metadata at all, then re-encoded. The photo's orientation is kept; everything else goes.",
    ],
    faq: [
      {
        q: "Is my photo uploaded anywhere?",
        a: "No. Reading and cleaning both happen in this browser tab. There is no upload route in the code, and the server never sees a pixel.",
      },
      {
        q: "Does removing EXIF data remove the GPS location?",
        a: "Yes. GPS coordinates are stored in the EXIF block, and the clean copy has no EXIF block at all — CapyStrip re-scans the output to confirm it.",
      },
      {
        q: "Which formats can it clean?",
        a: "JPEG and PNG come back in their own format, and WebP does too where the browser can encode it. AVIF is saved as PNG, and HEIC as JPEG, because browsers cannot encode those formats.",
      },
      {
        q: "Can it clean HEIC photos from an iPhone?",
        a: "It always reads a HEIC photo's full report. Downloading a clean copy needs a browser that can decode HEIC, which today is Safari; it is saved as JPEG.",
      },
      {
        q: "What about TIFF files?",
        a: "TIFF gets a complete report, but browsers cannot decode TIFF pixels, so there is no clean copy to download.",
      },
      {
        q: "Does it reduce image quality?",
        a: "PNG is lossless. JPEG and WebP are re-encoded, which is what removes the metadata, so expect a file that looks the same and is often smaller.",
      },
    ],
  },
  CapyBg: {
    heading: "How to remove a background from an image, without uploading it",
    steps: [
      "Drop, paste or pick a photo.",
      "The first cut downloads the model once (6.3 MB) and keeps it in your browser. Every cut after that runs offline in a blink.",
      "Pick a backdrop — transparent, light, dark or any colour — and download a PNG, or a JPEG with a quality slider.",
    ],
    about: [
      "CapyBg runs a segmentation model inside your browser tab: on your GPU through WebGPU where it can, on your CPU through WebAssembly where it can't. The result line says which one actually ran, with the real milliseconds.",
      "The default model, MODNet, is tuned for people — portraits, headshots and profile photos. On browsers whose GPU can run it, an opt-in detailed model (BiRefNet_lite) handles products and pets.",
      "Changing the backdrop or the format recomposes from the kept matte instantly, so you can try a transparent PNG and a white-background JPEG without cutting twice.",
    ],
    faq: [
      {
        q: "Is my image uploaded to a server?",
        a: "No. There is no upload route in the code. The only things the tool downloads are the model and its runtime, from this site, on first use. After that, the browser's Network panel shows zero requests during a cut.",
      },
      {
        q: "Is it free? Is there a watermark or a size limit on the download?",
        a: "It is free and open source, with no watermark and no account. The cut comes out at your photo's full resolution — unless the photo is larger than the browser can hold on a canvas, in which case the tool halves it and tells you the size it used.",
      },
      {
        q: "Does it work offline?",
        a: "Once the model is cached, yes — the cut itself makes no network requests. A link at the bottom of the tool removes the cached model again.",
      },
      {
        q: "Can it make a transparent PNG?",
        a: "Yes. Transparent PNG is the default. You can also flatten onto light, dark or any colour, and export JPEG.",
      },
      {
        q: "Does it work on product photos and pets?",
        a: "The default model is tuned for people. The detailed model handles products and pets on browsers whose GPU can run it; where it can't, the tool says so and finishes the cut with the people model.",
      },
    ],
  },
};
