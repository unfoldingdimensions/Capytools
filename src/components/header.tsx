import { CapyMark } from "@/components/mascot/CapyMark";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-5">
      <div className="flex items-center gap-2.5">
        <CapyMark className="h-7 w-9 text-foreground/85" />
        <span className="text-base font-bold tracking-tight text-foreground">Capytools</span>
        <span className="hidden text-sm text-muted-foreground sm:inline">· calm tools</span>
      </div>
      <ThemeToggle />
    </header>
  );
}
