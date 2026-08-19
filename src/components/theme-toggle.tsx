"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Avoid the hydration mismatch (server renders a size placeholder).
  if (!mounted) return <div className="h-9 w-9" aria-hidden />;
  const dark = theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label="Toggle theme"
      className="rounded-full"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
