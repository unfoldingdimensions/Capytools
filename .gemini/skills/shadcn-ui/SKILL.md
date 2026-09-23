---
name: shadcn-ui
description: Guide to using Shadcn UI components in this project, including initialization, component addition, and theming. Use this when the user asks to "add a button", "create a form", or specifically mentions shadcn.
---

# Shadcn UI Skill

Shadcn UI is a collection of re-usable components that you can copy and paste into your apps. It is **NOT** a component library like Material UI. It is code you own.

## 1. Core Principles

- **Ownership**: The code lives in your `components/ui` folder. You can and should modify it.
- **Styling**: Built on Tailwind CSS.
- **Accessibility**: Built on Radix UI primitives.
- **Theming**: Uses CSS variables for consistent design.

## 2. Installation (Vite + Tailwind)

If not yet initialized:

```bash
npx shadcn@latest init
```

Recommended settings for this project (Monochrome/Zinc):
- **Typography**: Slate (or Zinc)
- **Style**: New York (usually preferred for professional look) or Default
- **Color**: Zinc (matches the "CapyResume" aesthetic)
- **CSS Variables**: Yes (Required)

## 3. Adding Components

To add a component (e.g., Button):

```bash
npx shadcn@latest add button
```

This will create `src/components/ui/button.tsx`.

## 4. Theming & Customization

### The "CapyResume" Connection
This project uses a strict Monochrome design system (see `mastering-ui-design` skill). Shadcn's default "Zinc" theme aligns well with this.

**To customize:**
1.  Edit `src/styles/index.css` (or wherever `npx shadcn init` setup the variables).
2.  Ensure `--primary` is mapped to your specific black/zinc values.
3.  Ensure `--radius` matches your design tokens (e.g., `0.5rem`).

### Example Mapping
If you use the `mastering-ui-design` tokens:
```css
:root {
  /* Shadcn uses these standard names */
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%; /* Zinc 900 */
  --primary-foreground: 0 0% 98%;
  /* ... etc */
}
```

## 5. Common Workflow

1.  **Identify Need**: "I need a dialog modal."
2.  **Add Component**: `npx shadcn@latest add dialog`
3.  **Import & Use**:
    ```tsx
    import {
      Dialog,
      DialogContent,
      DialogTrigger,
    } from "@/components/ui/dialog"
    ```
4.  **Refine**: Open `src/components/ui/dialog.tsx` and adjust styles if needed to strictly match the project's design system (e.g. remove specific borders or shadows if they conflict with `shadow-swiss`).
