import Link from "next/link";
import { BookOpen } from "lucide-react";

import { CapyMark } from "@/components/mascot/CapyMark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TOOLS = [
  { href: "/capywrapped", label: "Wrapped" },
  { href: "/capyimagine", label: "Imagine" },
  { href: "/capycreator", label: "Creator" },
  { href: "/capystrip", label: "Strip" },
  { href: "/capyexpense", label: "Expense" },
] as const;

/** `tool` names the current tool beside the wordmark; omit it on the landing page. */
export function Header({ tool }: { tool?: string }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <CapyMark className="h-7 w-9 shrink-0 text-foreground/85" />
          {/*
            items-baseline, not items-center: the wordmark is 16px and the tool
            name 14px, so centring their BOXES left the smaller text sitting
            1.2px above the wordmark's baseline. The mark stays centred on the
            text block via the outer items-center.
          */}
          <span className="flex items-baseline gap-1.5">
            <span className="text-base font-bold tracking-tight text-foreground">Capytools</span>
            {tool && (
              <span className="hidden text-sm text-muted-foreground sm:inline">· {tool}</span>
            )}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex" aria-label="Tools navigation">
          {TOOLS.map((t) => {
            const active = tool?.toLowerCase().includes(t.label.toLowerCase());
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          {/*
            Nativised (D18): the old "made by" GitHub link was the only external
            href in the shared chrome; the notes page now holds the repo and
            issue-tracker links instead.
          */}
          <Button asChild variant="ghost" size="icon" className="size-10 rounded-full sm:size-9">
            <Link href="/notes" aria-label="Project notes and issue tracker">
              <BookOpen className="h-4 w-4" />
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
