import type { Metadata } from "next";
import { ShareCardView } from "@/components/share/ShareCardView";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://capytools.vercel.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const title = `@${username} · Cappy Wrapped`;
  const description = `${username}'s GitHub year, wrapped in a calm little card. No signup. No tracking. Nothing stored.`;
  const image = `${SITE}/api/og/${username}`;
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
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 pb-20 pt-12">
      <div className="mb-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          Cappy Wrapped · @{username}
        </p>
      </div>
      <ShareCardView username={username} />
    </main>
  );
}
