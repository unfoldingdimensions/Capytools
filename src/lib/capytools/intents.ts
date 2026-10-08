/**
 * Intent pages: one tool, opened on a preset, at the URL people search for.
 *
 * A tool page can only rank for so many phrasings. "favicon generator" and
 * "resize image" are different searches with different answers, even though
 * CapyResize does both. Each row here is a page at `href` that opens its tool
 * on that intent's preset, with its own copy and guide.
 *
 * The rule that keeps these from being doorway pages: every row must OPEN THE
 * TOOL DIFFERENTLY (a stage, a payload, a mode) and say something its tool
 * page doesn't. A row that would only repeat the tool page under a new URL
 * does not belong here.
 *
 * Each `href` needs its page file under `src/app/`; the sitemap, the tool
 * pages' "also" links and `tests/intent-pages.test.ts` all read this list.
 */

import { SIZE_PRESETS } from "@/lib/capyog/sizes";
import type { ToolGuide } from "@/lib/capytools/guides";

export type IntentPage = {
  href: string;
  /** The SUITE row whose component this page renders. */
  tool: string;
  /** The "also" link's label. */
  label: string;
  title: string;
  description: string;
  headline: { text: string; em?: boolean; dot?: boolean }[];
  lead: string;
  guide: ToolGuide;
};

/** The OG sizes FAQ, read from the presets the tool actually ships. */
const ogSizeFaq = SIZE_PRESETS.map((preset) => ({
  q: `What size is a ${preset.label.toLowerCase()} image?`,
  a: `${preset.width}×${preset.height} pixels, for ${preset.platforms.replace(/ · /g, ", ")}. ${preset.note}.`,
}));

export const INTENT_PAGES: readonly IntentPage[] = [
  {
    href: "/favicon-generator",
    tool: "CapyResize",
    label: "Favicon generator",
    title: "Favicon generator — every icon size and the HTML, free, no upload | CapyResize",
    description:
      "Drop one logo, get favicon.ico, apple-touch-icon, 192/512 and maskable icons, a web manifest and the <head> snippet in a ZIP. 100% in your browser.",
    headline: [{ text: "One logo," }, { text: "every favicon", em: true, dot: true }],
    lead: "Drop a logo, get the whole icon pack and the HTML to paste. Nothing uploaded.",
    guide: {
      heading: "How to make a favicon for your website",
      summary:
        "Drop one logo and get every favicon a site needs — favicon.ico, the Apple touch icon, Android and maskable icons and a web manifest — plus the HTML, in one ZIP.",
      steps: [
        "Drop one square-ish logo — PNG, JPEG, WebP or SVG.",
        "Name the site and pick a background colour for the icons that need one, then check the 16 and 32 px preview strip.",
        "Download the ZIP, put the files at your site's root, and paste the four lines of HTML into your page's head.",
      ],
      about: [
        "A modern site needs more than one favicon.ico. Browsers, iPhones, Android home screens and installable web apps each look for a different file at a different size.",
        "The pack holds favicon.ico with 16, 32 and 48 px frames, a 180 px apple-touch-icon.png, the 192 and 512 px icons Chrome needs before it offers to install a site, a separate maskable 512 px icon with the art inside the safe zone, manifest.webmanifest, and the exact HTML that links them. Drop an SVG and it's included as favicon.svg too.",
        "The 16 and 32 px strip shows how the logo looks at browser-tab size, where fine detail disappears, before you ship it.",
      ],
      faq: [
        {
          q: "What favicon sizes do I need?",
          a: "favicon.ico (16, 32 and 48 px), a 180 px Apple touch icon, and 192 and 512 px PNGs in a web manifest. A maskable 512 px icon lets Android crop it to any shape.",
        },
        {
          q: "What is a maskable icon?",
          a: "An icon whose art sits inside a central safe zone, so Android can crop it into a circle, squircle or rounded square without cutting the logo off.",
        },
        {
          q: "Where do the files go?",
          a: "At the root of your site, next to your homepage, so /favicon.ico resolves. The HTML snippet assumes that location.",
        },
        {
          q: "Is my logo uploaded?",
          a: "No. Every icon is drawn and zipped in your browser. Nothing is uploaded or stored.",
        },
      ],
    },
  },
  {
    href: "/png-to-webp",
    tool: "CapyResize",
    label: "PNG to WebP",
    title: "Convert PNG to WebP free — in your browser, no upload | CapyResize",
    description:
      "Convert PNG or JPEG to WebP with a quality slider and real before/after file sizes. Resize at the same time. 100% in your browser, nothing uploaded.",
    headline: [{ text: "PNG in," }, { text: "WebP out", em: true, dot: true }],
    lead: "Convert to WebP with a quality you can see and the real byte count. Nothing uploaded.",
    guide: {
      heading: "How to convert PNG to WebP",
      summary:
        "Convert PNG or JPEG images to WebP in your browser, with a quality slider and the real before-and-after file sizes.",
      steps: [
        "Drop a PNG, JPEG or WebP image. WebP is already selected as the output.",
        "Move the quality slider and, if you like, set a smaller width with the aspect ratio locked.",
        "Compare the real before and after file sizes, then download the WebP.",
      ],
      about: [
        "WebP keeps transparency like PNG and compresses like JPEG, so a PNG converted to WebP is usually much smaller with no visible difference. Every current browser displays it.",
        "The sizes shown are measured after the image is actually encoded, not estimated. If your browser can't encode WebP — older Safari silently writes PNG instead — the tool says so rather than hand you a PNG with a .webp name.",
      ],
      faq: [
        {
          q: "Does WebP keep transparency?",
          a: "Yes. Transparent areas in a PNG stay transparent in the WebP.",
        },
        {
          q: "Will converting reduce quality?",
          a: "WebP at high quality is visually identical for most images. Lower the slider for smaller files and compare as you go.",
        },
        {
          q: "Can I convert to JPEG instead?",
          a: "Yes. Pick JPEG as the output. Transparency is flattened onto a colour you choose, since JPEG has none.",
        },
        {
          q: "Are my images uploaded?",
          a: "No. Conversion happens in your browser. Nothing is uploaded or stored.",
        },
      ],
    },
  },
  {
    href: "/wifi-qr-code-generator",
    tool: "CapyQR",
    label: "Wi-Fi QR code",
    title: "Wi-Fi QR code generator — guests join without typing the password | CapyQR",
    description:
      "Make a QR code that joins your Wi-Fi in one scan. WPA, WEP or open networks, hidden SSIDs, symbols escaped correctly. Free, no tracking, 100% in your browser.",
    headline: [{ text: "Scan," }, { text: "you're on the Wi-Fi", em: true, dot: true }],
    lead: "A QR code that joins your network in one scan. The password never leaves this tab.",
    guide: {
      heading: "How to make a QR code for your Wi-Fi",
      summary:
        "Make a QR code that joins your Wi-Fi network in one scan, so guests never type the password — and the password never leaves your browser.",
      steps: [
        "Enter the network name (SSID) and password, and pick the security type — WPA/WPA2, WEP or none. Tick hidden if the network doesn't broadcast its name.",
        "Style it if you like. The tool scans its own output to confirm it still reads.",
        "Download a PNG, JPEG or SVG and print it for the fridge, the front desk or a guest room.",
      ],
      about: [
        "Phone cameras on iOS and Android recognise Wi-Fi QR codes and offer to join the network directly — no typing a long password, no spelling it out loud.",
        "Passwords with symbols are a common reason Wi-Fi codes fail: characters like ; , : and \\ have to be escaped in the code. CapyQR escapes them exactly as the format requires.",
      ],
      faq: [
        {
          q: "Is my Wi-Fi password safe?",
          a: "It never leaves your browser — the code is drawn on this device and nothing is uploaded. Anyone who scans the printed code can join, so treat it like the password itself.",
        },
        {
          q: "Do iPhones and Android phones support it?",
          a: "Yes. The built-in camera on both recognises Wi-Fi QR codes and offers to join.",
        },
        {
          q: "What if I change my password?",
          a: "The password is stored in the code itself, so you'll need to make and print a new one.",
        },
        {
          q: "Does the code expire?",
          a: "No. There is no redirect or service behind it; the network details are in the pattern.",
        },
      ],
    },
  },
  {
    href: "/vcard-qr-code-generator",
    tool: "CapyQR",
    label: "vCard QR code",
    title: "vCard QR code generator — a contact card in one scan, free | CapyQR",
    description:
      "Turn your name, phone, email and company into a QR code that saves straight to contacts. For business cards and name badges. Free, no tracking, 100% in your browser.",
    headline: [{ text: "Your card," }, { text: "in one scan", em: true, dot: true }],
    lead: "A QR code that saves you to someone's contacts. Nothing uploaded, nothing tracked.",
    guide: {
      heading: "How to make a QR code for your contact details",
      summary:
        "Make a QR code that saves your name, phone, email and company straight to someone's contacts in one scan, with no hosted profile and no tracking.",
      steps: [
        "Fill in your name and whichever of phone, email, company and website you want to share.",
        "Style it with your colours and a logo. The tool scans its own output to confirm it still reads.",
        "Export PNG or JPEG for print, or SVG when there's no logo, and put it on a business card, badge or email signature.",
      ],
      about: [
        "A vCard QR code holds a contact card in the standard vCard format. Scanning it with a phone camera offers to save you to contacts, with every field already filled in.",
        "Unlike many QR generators, there's no link to a hosted profile page in between. The details are in the code itself, so there's nothing to expire, no subscription and no scan tracking.",
      ],
      faq: [
        {
          q: "What is a vCard QR code?",
          a: "A QR code containing a contact card in vCard format. Phones read it and offer to add the contact.",
        },
        {
          q: "Can I update the details later?",
          a: "Not in the same code — the details are stored in it. A static code also means it can never break or start showing someone else's page.",
        },
        {
          q: "How much can I fit?",
          a: "More fields make a denser code. The tool shows how full the code is and warns before it gets hard to scan at small sizes.",
        },
        {
          q: "Is my information uploaded?",
          a: "No. The code is made in your browser. Nothing is uploaded or stored.",
        },
      ],
    },
  },
  {
    href: "/og-image-size",
    tool: "CapyOG",
    label: "OG image sizes",
    title: "OG image size guide — X, LinkedIn, Facebook, Instagram, Pinterest | CapyOG",
    description:
      "The Open Graph and social image sizes each platform documents — 1200×630 link cards, Instagram, Stories, YouTube, Pinterest — with a free generator to make them.",
    headline: [{ text: "The right size," }, { text: "for every feed", em: true, dot: true }],
    lead: "The social image sizes each platform documents, and a card maker that exports them.",
    guide: {
      heading: "Open Graph and social image sizes, by platform",
      summary:
        "The standard Open Graph image is 1200×630 pixels; below are the sizes each platform documents, and a card maker that exports them.",
      steps: [
        "Find your platform below. For a link preview anywhere, use 1200×630.",
        "Pick that size preset in the card maker above.",
        "Export PNG at 1×–3× or JPEG, and set it as your page's og:image.",
      ],
      about: [
        "The og:image is the picture shown when your link is shared. Use 1200×630 pixels — a 1.91:1 ratio — and it works for link previews on X, LinkedIn, Facebook, Slack and Discord.",
        "The sizes below are taken from what each platform documents, not from figures copied between blog posts. They are the same presets the card maker above uses.",
      ],
      faq: ogSizeFaq,
    },
  },
  {
    href: "/contrast-checker",
    tool: "CapyTone",
    label: "Contrast checker",
    title: "Color contrast checker — WCAG AA/AAA and APCA, side by side | CapyTone",
    description:
      "Check text and background colours against WCAG 2 AA and AAA for normal and large text, with APCA Lc beside it. Free, in your browser, nothing stored.",
    headline: [{ text: "Can they read it?" }, { text: "Check the contrast", em: true, dot: true }],
    lead: "WCAG 2 ratios and APCA Lc for any two colours, with the verdicts spelled out.",
    guide: {
      heading: "How to check colour contrast for accessibility",
      summary:
        "Check whether text is readable on its background: the WCAG 2 contrast ratio with AA and AAA verdicts, and the APCA value beside it.",
      steps: [
        "Set a text colour and a background colour.",
        "Read the WCAG 2 contrast ratio with AA and AAA verdicts for normal and large text, and the APCA Lc value beside it.",
        "Adjust until both pass for the size you're using.",
      ],
      about: [
        "WCAG 2 is the contrast standard most accessibility rules reference. AA requires 4.5:1 for normal text and 3:1 for large text; AAA requires 7:1 and 4.5:1.",
        "APCA is a newer method that accounts for which colour is the text and which is the background, and tends to judge dark mode more accurately. It is a candidate for future guidelines, not yet a requirement, and the tool labels it that way.",
      ],
      faq: [
        {
          q: "What contrast ratio do I need?",
          a: "For WCAG 2 AA: at least 4.5:1 for normal text and 3:1 for large text (about 24 px, or 19 px bold). AAA raises those to 7:1 and 4.5:1.",
        },
        {
          q: "What is APCA?",
          a: "The Accessible Perceptual Contrast Algorithm, proposed for future WCAG versions. It gives an Lc value instead of a ratio and depends on which colour is the text.",
        },
        {
          q: "Should I use WCAG 2 or APCA?",
          a: "Meet WCAG 2 where you have legal or policy requirements; it is the current standard. Use APCA as extra guidance, especially for dark themes.",
        },
        {
          q: "Is anything stored?",
          a: "No. The check runs in your browser and nothing is saved.",
        },
      ],
    },
  },
  {
    href: "/gradient-generator",
    tool: "CapyTone",
    label: "Gradient generator",
    title: "CSS gradient generator — Oklab & OKLCH, no muddy middles | CapyTone",
    description:
      "Make linear, radial and conic CSS gradients with two or three stops, blended in Oklab, OKLCH or sRGB. Copy modern CSS with a fallback. Free, in your browser.",
    headline: [{ text: "Two colours," }, { text: "a clean blend", em: true, dot: true }],
    lead: "Linear, radial or conic, blended in Oklab or OKLCH, copied as CSS that works everywhere.",
    guide: {
      heading: "How to make a smooth CSS gradient",
      summary:
        "Make smooth linear, radial or conic CSS gradients blended in Oklab or OKLCH, and copy the CSS with a fallback for older browsers.",
      steps: [
        "Pick two or three colours and a shape — linear, radial or conic.",
        "Choose the colour space to blend in: Oklab, OKLCH, OKLCH on the longer hue arc, or sRGB.",
        "Copy the CSS. It comes with a fallback for browsers that don't support colour-space interpolation yet.",
      ],
      about: [
        "A plain CSS gradient blends in sRGB, which is why blue to yellow passes through a dull grey. Blending in Oklab or OKLCH keeps the middle bright and even.",
        "The output uses the modern `in oklab` gradient syntax, plus a fallback built from many hex stops sampled along the same blend, so browsers that would drop the modern line still show the same gradient.",
      ],
      faq: [
        {
          q: "Why does my gradient look muddy in the middle?",
          a: "It's blending in sRGB. Switch to Oklab or OKLCH and the midpoint keeps its brightness and colour.",
        },
        {
          q: "Oklab or OKLCH?",
          a: "Oklab gives the smoothest, most neutral blend. OKLCH travels around the colour wheel, so it keeps more saturation and can pass through intermediate hues.",
        },
        {
          q: "Does the CSS work in every browser?",
          a: "Current browsers support the modern syntax; the hex-stop fallback covers the rest.",
        },
        {
          q: "Is anything stored?",
          a: "No. Gradients are made in your browser and nothing is saved.",
        },
      ],
    },
  },
  {
    href: "/event-qr-code-generator",
    tool: "CapyQR",
    label: "Event QR code",
    title: "Event QR code generator — add to calendar in one scan, free, no tracking | CapyQR",
    description:
      "Make a QR code that adds your event — title, start, end and place — to a phone's calendar in one scan. Never expires, no tracking. 100% in your browser.",
    headline: [{ text: "Scan it," }, { text: "it's on the calendar", em: true, dot: true }],
    lead: "A QR code that holds the whole event. No short link, no tracking, nothing uploaded.",
    guide: {
      heading: "How to make a QR code that adds an event to a calendar",
      summary:
        "Make a QR code that adds your event — title, times and place — to a phone's calendar in one scan; it never expires and scans aren't tracked.",
      steps: [
        "Enter the event's title, start and end time, and — if you like — where it is.",
        "Style it with your colours and a logo. The tool scans its own output to confirm it still reads.",
        "Export PNG or JPEG for print, or SVG when there's no logo, and put it on the flyer, poster, ticket or invitation.",
      ],
      about: [
        "An event QR code holds a calendar event in the standard iCalendar (VEVENT) format. A phone camera or QR app that understands calendar events offers to save it, with the title, times and place already filled in.",
        "Many event QR generators give you a short link to their own page instead, which can track scans and stop working when a subscription ends. This code holds the event itself, so there is nothing in between to expire.",
      ],
      faq: [
        {
          q: "Which time zone are the times in?",
          a: "The code stores the times without a time zone, so a phone reads them as its own local time. That suits an in-person event; for an online event with guests in other time zones, say the time zone in the title.",
        },
        {
          q: "Does every phone support it?",
          a: "Support for calendar QR codes varies by phone and camera app. If a camera only shows the text, a QR scanner app will offer to add the event.",
        },
        {
          q: "Can I change the event after printing?",
          a: "No — the details are stored in the code itself. If the time or place changes, make and print a new code.",
        },
        {
          q: "Is it free? Does it expire?",
          a: "It's free, with no account, no watermark and no expiry, and scans aren't tracked. Nothing you type is uploaded.",
        },
      ],
    },
  },
  {
    href: "/website-color-extractor",
    tool: "CapyTone",
    label: "Website colour extractor",
    title: "Website color palette extractor — get any site's colors from its URL | CapyTone",
    description:
      "Paste a website's address and get its colour palette as hex codes, read from its HTML, stylesheets, theme colour and manifest and ranked by use. Free, nothing stored.",
    headline: [{ text: "Any site's colours," }, { text: "from its address", em: true, dot: true }],
    lead: "Paste a public URL, get the palette its code declares, ranked. Honest about what it can't see.",
    guide: {
      heading: "How to get the colour palette of a website",
      summary:
        "Paste a website's address to get the colours its code declares, as hex codes ranked by how much they're used.",
      steps: [
        "Paste the address of a public web page.",
        "The tool reads the page's HTML, up to five of its stylesheets, its declared theme colour and its web manifest, then ranks the colours it finds.",
        "Copy the hex codes you need.",
      ],
      about: [
        "CapyTone reads the colours a site declares in its own code and ranks them by how much they're used. Near-identical shades are merged with the CIEDE2000 colour-difference formula, so you get a palette rather than forty slightly different greys.",
        "It reads the page's code, not a screenshot. Colours added by JavaScript after the page loads, and colours inside images, aren't visible to it — the tool says so rather than guessing.",
        "This is the one CapyTone mode that uses the site's server: your browser can't read another site's code directly, so the server fetches exactly the address you paste, refuses private network addresses, gives up after 10 seconds, 3 MB or 3 redirects, and returns only the colours.",
      ],
      faq: [
        {
          q: "Why is a colour I can see on the site missing?",
          a: "It's probably set by JavaScript or inside an image. The extractor reads the HTML and stylesheets the page ships with, so it only sees colours declared there.",
        },
        {
          q: "Is the website I check stored or logged?",
          a: "The site's code doesn't store or log either. The address travels in the request body, not the URL; the server fetches the page, returns only the colours and their counts, and keeps neither the address nor the page.",
        },
        {
          q: "Can it read pages behind a login?",
          a: "No. It fetches only public addresses, as an anonymous visitor would see them, and refuses private and local network addresses.",
        },
        {
          q: "Can I turn the colours into a palette I can use?",
          a: "Yes. CapyTone's other modes take it from there — check a pair's contrast, build harmonies from one colour, or blend two into a gradient.",
        },
      ],
    },
  },
  {
    href: "/midjourney-prompt-generator",
    tool: "CapyImagine",
    label: "Midjourney prompts",
    title: "Random Midjourney prompt generator — ready to paste, with parameters, free | CapyImagine",
    description:
      "Roll a random, ready-to-paste Midjourney prompt: subject, setting, light, lens and style, with --s, a --no clause and --ar for your format. Free, no signup, no API key.",
    headline: [{ text: "Stuck at /imagine?" }, { text: "Roll one", em: true, dot: true }],
    lead: "Random Midjourney prompts in Midjourney's own syntax. Made in your tab, nothing stored.",
    guide: {
      heading: "How to get a random Midjourney prompt",
      summary:
        "Roll a random Midjourney prompt — subject, setting, light, lens and style — ready to paste with --s, --no and, once you pick a format, --ar.",
      steps: [
        "Midjourney is already selected. Roll a prompt.",
        "Pick where the image is going — an Instagram story, a YouTube thumbnail, a Pinterest pin — to add the right --ar, lock a style if you want one, and roll again until something sparks.",
        "Copy it and paste it after /imagine — or into the Midjourney web app's prompt bar.",
      ],
      about: [
        "This is a random prompt generator, not a form to fill in. Each roll draws a subject, action, setting, time, lighting, lens, medium and composition, and writes them the way Midjourney reads prompts: short keyword phrases, then parameters.",
        "The parameters come with it: --s for stylize on every prompt, a single --no for things to leave out, and --ar for the aspect ratio once you pick a destination format. Only one --no, because Midjourney reads every word in it separately — a multi-word phrase there can remove the wrong thing.",
      ],
      faq: [
        {
          q: "Does it use AI to write the prompts?",
          a: "No. Prompts are assembled in your browser from curated lists, so it's instant, free and needs no API key or account.",
        },
        {
          q: "Does it generate the image?",
          a: "No. It writes the prompt; you run it in Midjourney.",
        },
        {
          q: "What do --ar, --s and --no mean?",
          a: "--ar sets the aspect ratio (for example 16:9), --s sets how strongly Midjourney applies its own style, and --no lists things to keep out of the image.",
        },
        {
          q: "Can I get prompts for other models?",
          a: "Yes. Switch the engine to Flux, SDXL, Gemini or a video model and the same roll is rewritten in that model's style.",
        },
      ],
    },
  },
];

export function intentPage(href: string): IntentPage {
  const page = INTENT_PAGES.find((row) => row.href === href);
  // Loud at build time: a page file whose row was renamed must not render.
  if (!page) throw new Error(`intentPage: no INTENT_PAGES row at ${href}`);
  return page;
}

export function intentsFor(tool: string): IntentPage[] {
  return INTENT_PAGES.filter((row) => row.tool === tool);
}
