/** The one footer, shared by the landing page, both tools and the share page. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-2 px-6 py-6 sm:flex-row">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          capytools — no signup. no cookies. nothing stored.
        </p>
        <p className="text-xs text-muted-foreground">more calm tools, coming soon</p>
      </div>
    </footer>
  );
}
