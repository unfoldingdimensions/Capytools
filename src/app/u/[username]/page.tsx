import type { Metadata } from "next";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { notFound } from "next/navigation";
import { ShareCardView } from "@/components/share/ShareCardView";
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
    openGraph: {
      title,
      description,
      type: "website",
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
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <Header tool="CapyWrapped" />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 pb-20 pt-5">
        <div className="mb-6 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            CapyWrapped · @{clean}
          </p>
        </div>
        <ShareCardView username={clean} />
      </main>

      <SiteFooter />
    </div>
  );
}
