import type { LanguageShare } from "@/lib/github/types";

/**
 * Language distribution bars — thin, near-sharp corners ("grass, not pills"),
 * sage-mid fill on a faint track. Left label, bar, mono percentage.
 */
export function LanguageBars({
  languages,
  className,
}: {
  languages: LanguageShare[];
  className?: string;
}) {
  if (languages.length === 0) return null;
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      {languages.map((lang) => (
        <div key={lang.name} className="flex items-center gap-2.5">
          <span className="w-20 shrink-0 truncate text-[11px] font-medium text-muted-foreground">
            {lang.name}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-[2px] bg-black/[.06] dark:bg-white/[.08]">
            <div
              className="h-full rounded-[2px]"
              style={{
                width: `${Math.min(100, lang.percent)}%`,
                background: "var(--sage-mid)",
              }}
            />
          </div>
          <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
            {lang.percent}%
          </span>
        </div>
      ))}
    </div>
  );
}
