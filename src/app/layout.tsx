import type { Metadata } from "next";
import { Albert_Sans, Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { MotionProvider } from "@/components/motion-provider";
import { HydrationMark } from "@/components/hydration-mark";
import { OG_DEFAULTS, TWITTER_DEFAULTS } from "@/lib/capytools/og";
import { SITE_URL } from "@/lib/utils";
import { NAME_SHIM } from "@/lib/capytools/theme-shim";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

// The label voice (eyebrows, tags, code). It was IBM Plex Mono; the family is
// now Albert Sans — a geometric sans — but the token keeps its `--font-mono`
// name so every `font-mono` utility resolves to it in one place.
const label = Albert_Sans({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Without this, a relative OG image is emitted as-is and every crawler that
  // needs an absolute URL — which is all of them — silently shows no card.
  metadataBase: new URL(SITE_URL),
  title: "Capytools — calm little tools",
  description:
    "Small tools that run in your browser and keep nothing. No signup. No cookies. Nothing stored.",
  openGraph: {
    title: "Capytools — calm little tools",
    description:
      "Small tools that run in your browser and keep nothing. No signup. No cookies. Nothing stored.",
    ...OG_DEFAULTS,
  },
  twitter: TWITTER_DEFAULTS,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        sans.variable,
        display.variable,
        label.variable,
        "font-sans",
      )}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NAME_SHIM }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* One reduced-motion contract for every motion.* in the app. */}
          <MotionProvider>{children}</MotionProvider>
          <HydrationMark />
        </ThemeProvider>
      </body>
    </html>
  );
}
