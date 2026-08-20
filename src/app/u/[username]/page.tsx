import type { Metadata } from "next";
import { Header } from "@/components/header";
import { ShareCardView } from "@/components/share/ShareCardView";
import { SITE_URL } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const title = `@${username} · Cappy Wrapped`;
  const description = `${username}'s GitHub year, wrapped in a calm little card. No signup. No tracking. Nothing stored.`;
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
      <Header />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 pb-20 pt-5">
        <div className="mb-6 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Cappy Wrapped · @{username}
          </p>
        </div>
        <ShareCardView username={username} />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-2 px-6 py-6 sm:flex-row">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            capytools — no analytics. no cookies. nothing stored.
          </p>
          <p className="text-xs text-muted-foreground">more calm tools, coming soon</p>
        </div>
      </footer>
    </div>
  );
}
