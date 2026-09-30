import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { ShareCardView } from "@/components/share/ShareCardView";
import { OG_DEFAULTS } from "@/lib/capytools/og";
import { SITE_URL, sanitizeUsername } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  // Never echo the raw segment: without this, /u/<any text> renders that text as
  // the page title and og:description, i.e. someone else's copy under this domain.
  const clean = sanitizeUsername(username);
  if (!clean) return { title: "Not found · CapyWrapped" };

  const title = `@${clean} · CapyWrapped`;
  const description = `${clean}'s GitHub year, wrapped in a calm little card. No signup. No cookies. Nothing stored.`;
  const image = `${SITE_URL}/api/og/${encodeURIComponent(clean)}`;
  return {
    title,
    description,
    // Spread first: a declared `openGraph` REPLACES the layout's whole block,
    // so without this the page silently drops siteName and locale. The
    // per-user card then overrides the image the suite ships by default.
    openGraph: {
      ...OG_DEFAULTS,
      title,
      description,
      url: `${SITE_URL}/u/${clean}`,
      images: [{ url: image, width: 1200, height: 630, alt: `@${clean} on GitHub — wrapped by Capytools` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      images: [image],
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const clean = sanitizeUsername(username);
  if (!clean) notFound();

  return (
    <PageShell tool="CapyWrapped" width="4xl" layout="card">
      <div className="mb-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          CapyWrapped · @{clean}
        </p>
      </div>
      <ShareCardView username={clean} />
    </PageShell>
  );
}
