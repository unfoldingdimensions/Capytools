/**
 * The person behind the suite — rendered on /notes#author, credited in the
 * footer, and stated to crawlers as the `Person` in the site's JSON-LD
 * (structured-data.ts). One copy, so the visible bio and the machine-readable
 * one cannot disagree.
 *
 * Its own module, not a row in landing.ts: the footer renders inside the
 * client-side error boundary (src/app/error.tsx), and importing landing.ts
 * there would ship the whole landing's copy to the browser.
 */
export const AUTHOR = {
  name: "Utkarsh Benjwal",
  /** How the tool pages' "Updated … · by" byline credits the maker. */
  byline: "Unfolding Dimensions",
  /** The portfolio's own headline, quoted rather than paraphrased. */
  tagline: "Analyst by day. Builder by night.",
  url: "https://unfoldingdimensions.com",
  profiles: [
    { label: "GitHub", href: "https://github.com/unfoldingdimensions" },
    { label: "X", href: "https://x.com/Ubendev" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/utkarsh-benjwal-447646200/" },
  ],
} as const;
