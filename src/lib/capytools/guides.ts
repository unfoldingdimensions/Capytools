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
  CapyWrapped: {
    heading: "How to make your GitHub Wrapped card",
    steps: [
      "Type a GitHub username — yours or anyone's with a public profile.",
      "Read the card: total public contributions, a month-by-month trendline with your busiest month marked, stars earned, top languages and your most-starred repo.",
      "Pick wide or square, light or dark, then download a PNG or post it straight to X.",
    ],
    about: [
      "CapyWrapped turns a GitHub profile's public activity into a single card worth sharing — a year in review for developers, any time of year rather than only in December.",
      "The trendline covers the last 12 months of contributions. Newer accounts get a window that fits how long they have been active, so the chart never opens on a run of empty months.",
    ],
    faq: [
      {
        q: "Do I need to log in with GitHub?",
        a: "No. There is no sign-in and no OAuth prompt. The card is built from public profile data only, so it works for any public username.",
      },
      {
        q: "Does it count private contributions?",
        a: "It shows what GitHub shows publicly. Private contributions appear only if the account has chosen to include them on its public profile.",
      },
      {
        q: "Is anything about me stored?",
        a: "No account, no cookies and no database. The site's server asks GitHub for the public profile on your behalf and briefly caches that public response, so a popular card doesn't hit GitHub's rate limit.",
      },
      {
        q: "What sizes can I download?",
        a: "Wide and square, each in light and dark, as a PNG.",
      },
    ],
  },
  CapyImagine: {
    heading: "How to generate random AI image and video prompts",
    steps: [
      "Pick your engine — Gemini, Midjourney, Flux or SDXL for images; Kling, Runway or Seedance for video.",
      "Roll a prompt. Subject, setting, lighting, lens, medium and composition are drawn at random and written in that engine's own syntax.",
      "Copy it into your engine, or roll again until one sparks.",
    ],
    about: [
      "Every image model reads prompts differently. Midjourney wants its parameters as flags, SDXL takes a separate negative prompt, and video models want camera motion. CapyImagine writes each prompt in the dialect of the engine you picked, aspect ratio and negative clauses included.",
      "It is a cure for the blank prompt box: a random but well-formed starting point you can edit, rather than a finished artwork.",
    ],
    faq: [
      {
        q: "Does it use AI to write the prompts?",
        a: "No. Prompts are assembled in your browser from curated lists, so generating one is instant, free and needs no API key.",
      },
      {
        q: "Will the prompt get blocked for naming an artist?",
        a: "For engines that refuse prompts naming living artists — Gemini and the video models — those references are left out, checked against a list of living artists. Engines without that rule can get them.",
      },
      {
        q: "Does it generate the image too?",
        a: "No. It writes the prompt; you paste it into the image or video tool you already use.",
      },
      {
        q: "Is anything saved?",
        a: "No. Nothing is uploaded or stored, and there is no account.",
      },
    ],
  },
  CapyCreator: {
    heading: "How to write a better prompt for Claude, GPT, Gemini and DeepSeek",
    steps: [
      "Describe what you want and pick the model you will send it to, from a small flash model to a frontier one.",
      "Answer the short questionnaire. It asks only what this kind of task needs, and asks more of you when the model is smaller.",
      "Copy the assembled prompt — or run an optional polish pass through your own LLM provider first.",
    ],
    about: [
      "The same prompt does not suit every model. A small, fast model needs a role, numbered steps, explicit constraints and an output format spelled out. A frontier reasoning model does better with a clear statement of intent and room to think. CapyCreator scales the prompt it builds to the model you pick.",
      "It covers Claude, DeepSeek, Gemini, GLM, GPT, Hunyuan and Qwen, and works as a system prompt generator as well as for one-off asks.",
    ],
    faq: [
      {
        q: "Do I need an API key?",
        a: "No. Building the prompt happens entirely in your browser. A key is only needed for the optional polish pass.",
      },
      {
        q: "Where does my text go when I polish?",
        a: "Straight from your browser to the provider you chose — OpenRouter, OpenCode-Go, Nous Portal, Command Code or any OpenAI-compatible endpoint. It never passes through this site's server.",
      },
      {
        q: "Where is my API key stored?",
        a: "Only in your browser's local storage, on this device. It is never sent to this site.",
      },
      {
        q: "Why does the model choice change the prompt?",
        a: "Smaller models follow structure and drift without it; larger models can be over-constrained by it. Matching the prompt to the model gets better answers from both.",
      },
    ],
  },
  CapyOG: {
    heading: "How to make an Open Graph image for your link previews",
    steps: [
      "Pick a template and a size preset — the 1200×630 link card, or a size for X, LinkedIn, Facebook, Discord, Instagram or Pinterest.",
      "Write your title and details, then choose an accent and light or dark.",
      "Download a PNG at 1×, 2× or 3×, a JPEG with a quality slider, or copy the image straight to your clipboard.",
    ],
    about: [
      "An Open Graph image is the picture that appears when a link is shared on social media or in a chat app. Without one, your link shows as a bare line of text or a randomly cropped image.",
      "Each size preset carries what the platform actually documents — X crops to 2:1, LinkedIn needs at least 1200×627, Facebook accepts up to 8 MB — rather than sizes passed around in blog posts.",
      "The preview is the card at its real pixel size, scaled to fit your screen, so what you see is exactly what you export.",
    ],
    faq: [
      {
        q: "What size should an OG image be?",
        a: "1200×630 pixels is the standard link card and works across X, LinkedIn, Facebook, Slack and Discord. Pinterest prefers a tall 1000×1500 pin.",
      },
      {
        q: "How do I add the image to my website?",
        a: "Upload the PNG with your site, then point an og:image meta tag at its full URL in the page's head. Most frameworks and CMSs have a field for it.",
      },
      {
        q: "Is anything uploaded?",
        a: "No. The card is composed and exported in your browser. No server renders it, and nothing is stored.",
      },
      {
        q: "Is it free?",
        a: "Yes, with no watermark and no account.",
      },
    ],
  },
  CapyQR: {
    heading: "How to make a QR code with your colours and logo",
    steps: [
      "Choose what it holds — a link, plain text, Wi-Fi login, a vCard contact or an email.",
      "Style it: dot shapes, corner treatments, colours or a gradient, a quiet-zone border and a centre logo. Five presets get you started.",
      "Check the \"verified scannable\" chip, then export PNG or JPEG at 512–2048 px, or SVG when there is no logo.",
    ],
    about: [
      "Styling a QR code makes it easier to break. Low contrast, a large logo or a thin border can all stop phones from reading it. CapyQR scans its own output in your browser before you export and shows you exactly what decoded.",
      "It also warns you before you print: contrast, quiet-zone width in modules, how full the code is, and whether the logo is too big — each labelled as a guideline, not a guarantee.",
    ],
    faq: [
      {
        q: "Do these QR codes expire?",
        a: "No. They are static: the link or data is encoded in the pattern itself, with no redirect service in between, so there is nothing to expire or switch off.",
      },
      {
        q: "Are scans tracked?",
        a: "No. There is no short link and no tracking redirect. A phone reads your data directly from the code.",
      },
      {
        q: "How do I make a Wi-Fi QR code?",
        a: "Pick Wi-Fi, enter the network name, password and security type. Special characters are escaped exactly as the Wi-Fi QR format requires, so passwords with symbols still work.",
      },
      {
        q: "Can I get an SVG?",
        a: "Yes, when no logo is set. SVG scales to any print size without blurring.",
      },
      {
        q: "Is it free?",
        a: "Yes, with no account and no watermark. Nothing is uploaded or stored.",
      },
    ],
  },
  CapyResize: {
    heading: "How to resize an image or make a favicon pack",
    steps: [
      "Drop an image — or, for favicons, one square-ish logo.",
      "To resize: set a target width with the aspect ratio locked, then pick PNG, JPEG or WebP and a quality. For favicons: switch to the favicon pack.",
      "Compare the real before-and-after file sizes, then download the image — or a ZIP with every icon and the HTML to paste.",
    ],
    about: [
      "Resizing goes through progressive halving — repeated steps of about 50%, the technique production image tools use — so fine lines and text survive a large downscale instead of turning jagged.",
      "The favicon pack holds favicon.ico (16, 32 and 48 px), apple-touch-icon.png (180 px), the 192 and 512 px icons Chrome needs to offer an install, a separate maskable 512 px icon with the art inside the safe zone, manifest.webmanifest, and the four lines of HTML for your page's head.",
      "A 16 and 32 px preview strip shows whether your logo still reads at browser-tab size before you ship it.",
    ],
    faq: [
      {
        q: "Are my images uploaded?",
        a: "No. Resizing, converting and packing all happen in your browser. Nothing is uploaded or stored.",
      },
      {
        q: "Can it convert PNG to WebP or JPEG?",
        a: "Yes. Pick the output format and quality. Converting to JPEG flattens transparency onto a colour you choose.",
      },
      {
        q: "What sizes do I need for a favicon?",
        a: "A favicon.ico with 16, 32 and 48 px frames, a 180 px Apple touch icon, and 192 and 512 px icons for the web manifest. The pack includes all of them.",
      },
      {
        q: "Does it work with animated GIFs?",
        a: "It takes the first frame and tells you so.",
      },
    ],
  },
  CapyToken: {
    heading: "How to count tokens and estimate LLM API cost",
    steps: [
      "Paste the prompt you are about to send.",
      "Read the exact counts under OpenAI's o200k_base (GPT-5 and GPT-4o era) and cl100k_base (GPT-4 era) encodings.",
      "Set your expected output length and compare input and output cost across GPT, Claude, Gemini, Grok, DeepSeek, Llama, Qwen and Mistral.",
    ],
    about: [
      "API pricing is per token, and the same text is a different number of tokens for different models. CapyToken counts with OpenAI's real tokenizers and puts the old rules of thumb — characters ÷ 4, words × ¾ — beside them as a cross-check.",
      "For Claude, Gemini and other non-OpenAI models there is no public exact tokenizer to run, so those rows are clearly labelled as estimates rather than presented as exact.",
      "The rate card carries the date its prices were verified, and context-window bars warn you when a prompt is close to — or over — a model's limit.",
    ],
    faq: [
      {
        q: "How many tokens is my text?",
        a: "Paste it in. For OpenAI models the count is exact. As a rough guide, one token is about four characters of English.",
      },
      {
        q: "Are the Claude and Gemini counts exact?",
        a: "No, and the tool says so: they are estimates based on OpenAI's tokenizer. Exact counts for those models come from their own APIs.",
      },
      {
        q: "Do I need an API key?",
        a: "No. Counting and pricing run in your browser with no key and no account.",
      },
      {
        q: "Is my prompt uploaded?",
        a: "No. Your text is never sent anywhere. The tokenizer files load from this site the first time you count, then everything runs locally.",
      },
      {
        q: "How current are the prices?",
        a: "The rate card shows the month it was verified. Prices change, so treat it as a dated snapshot and check the provider before a large spend.",
      },
    ],
  },
  CapyPixel: {
    heading: "How to turn a photo into pixel art",
    steps: [
      "Drop a photo, or an SVG logo.",
      "Pick a style — faithful, portrait, whale, Game Boy, 1-bit or 1-bit halftone — and adjust grid width, colour count and dither with the live preview.",
      "Export a crisp PNG at a whole-number scale, so every pixel stays a sharp square.",
    ],
    about: [
      "CapyPixel is a pixel art converter and image quantizer: it shrinks your image onto a grid, maps it to a limited palette and, where it helps, dithers the transitions.",
      "Each of the six styles comes with measured presets. Game Boy uses the four classic greens; 1-bit keeps solid areas solid and dithers only the edges; portrait separates the subject with an outline.",
      "Same image and same settings give the same output every time, so a result you like can be reproduced exactly.",
    ],
    faq: [
      {
        q: "Is my image uploaded?",
        a: "No. Everything runs in your browser. Nothing is uploaded or stored.",
      },
      {
        q: "Why does the preview look softer than the export?",
        a: "The live preview is capped in size so it stays responsive, and the tool says so. The export always renders your full grid.",
      },
      {
        q: "Can I make Game Boy-style art?",
        a: "Yes. The Game Boy style maps your image to the original four-colour green palette.",
      },
      {
        q: "Is it free?",
        a: "Yes, with no account and no watermark.",
      },
    ],
  },
  CapyTone: {
    heading: "How to make a colour palette from a mood",
    steps: [
      "Type a feeling or pick a mood — or start from a colour, like \"start from warm orange\".",
      "Get a five-colour palette laid out as a poster, with readable text contrast built in.",
      "Download the poster, or copy the palette as CSS variables or Tailwind tokens.",
    ],
    about: [
      "CapyTone is a colour palette generator that starts from words. A hand-tuned set of mood anchors turns your phrase into a palette, and the same phrase always gives the same palette, so you can share it.",
      "Every palette is built to pass WCAG AA contrast for its text before anything is drawn.",
      "Four more modes sit beside it: Generate builds palettes from colour-harmony rules (complementary, analogous, triadic and more); Check compares two colours with both WCAG 2 and APCA contrast; Blend makes gradients in Oklab or OKLCH; and Extract reads the colours from a public website.",
    ],
    faq: [
      {
        q: "Does it use AI?",
        a: "No. It uses a hand-tuned lexicon of moods and colours. Phrases it doesn't recognise still get a palette within the same guardrails, and the tool says it improvised.",
      },
      {
        q: "Is the contrast accessible?",
        a: "The palette's text-on-background pair always clears WCAG AA (4.5:1). Check mode shows any pair against both WCAG 2 and APCA.",
      },
      {
        q: "Can I get a website's colour palette?",
        a: "Yes, with Extract mode. Paste a public URL and it reads the page's HTML and stylesheets. Colours set by JavaScript can't be seen this way, and the tool says so.",
      },
      {
        q: "Is anything stored?",
        a: "No. Palettes are made in your browser. Extract mode is the one exception: the site's server fetches the public page you name, returns the colours, and keeps nothing.",
      },
    ],
  },
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
      "The first cut downloads the model once (12.4 MB) and keeps it in your browser. Every cut after that runs offline in a blink.",
      "Pick a backdrop — transparent, light, dark or any colour — and download a PNG, or a JPEG with a quality slider.",
    ],
    about: [
      "CapyBg runs a segmentation model inside your browser tab: on your GPU through WebGPU where it can, on your CPU through WebAssembly where it can't. The result line says which one actually ran, with the real milliseconds.",
      "The default model, MODNet, is tuned for people — portraits, headshots and profile photos. For groups, or someone in dark clothes against a dark backdrop, group mode adds a second people model (U²-Net, 167.8 MB, once) that decides who is in the photo while MODNet keeps the fine edges. On browsers with GPU support, an opt-in detailed model handles products, pets, logos and sheer fabric — BiRefNet_lite where the GPU can run it, ISNet where it can't.",
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
