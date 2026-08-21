import type { Metadata } from "next";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { ShareCardView } from "@/components/share/ShareCardView";
import { SITE_URL } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const title = `@${username} · CapyWrapped`;
  const description = `${username}'s GitHub year, wrapped in a calm little card. No signup. No cookies. Nothing stored.`;
  const image = `${SITE_URL}/api/og/${username}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: `@${username} on GitHub — wrapped by Capytools` }],
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
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <Header tool="CapyWrapped" />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 pb-20 pt-5">
        <div className="mb-6 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            CapyWrapped · @{username}
          </p>
        </div>
        <ShareCardView username={username} />
      </main>

      <SiteFooter />
    </div>
  );
}
