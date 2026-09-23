'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Lowercase labels, and the icon swap animates on transform only — never `all`. */
export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-transform duration-move ease-entrance dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-transform duration-move ease-entrance dark:rotate-0 dark:scale-100" />
          <span className="sr-only">change theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>system</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
