---
name: mastering-ui-design
description: Enforces the project's strict monochrome design system, animation patterns, and component usage. Use when creating new UI components, styling pages, or ensuring design consistency.
---

# Master UI/UX Design System

This skill encapsulates the "Handcraft Resume" design language: a premium, monochrome aesthetic that relies on depth, lighting, and texture rather than vibrant colors to create a "wow" factor.

## When to Use This Skill
- Creating new UI components (Buttons, Cards, Modals).
- Styling new pages or features.
- Refactoring legacy code to match the new design system.
- Designing micro-interactions and animations.

## Core Design Philosophy

### 1. The Monochrome Imperative
- **Rule #1**: No functional colors (blue, green, purple) for main UI elements.
- **Primary**: Zinc 900 (`#18181b`) / White.
- **Secondary**: Zinc 100 (`#f4f4f5`) / Zinc 900.
- **Accent**: Use strictly for focus rings or extremely subtle highlights.
- **Destructive**: The only exception (Red), but usage is minimized.

### 2. "Rich Aesthetics" via Depth & Texture
Since we don't use color for hierarchy, we use:
- **Shadows**: Custom `shadow-swiss` and `shadow-swiss-hover`.
- **Lighting**: "Spotlight" effects (radial gradients following mouse).
- **Texture**: Subtle noise overlays (`noise-overlay` class) and glassmorphism.
- **Animation**: Smooth, organic floating orbs for backgrounds (`landing-orb`).

## Design Tokens

### Typography
- **Headings**: `font-display` (Plus Jakarta Sans). Bold, tight tracking.
- **Body**: `font-sans` (Inter). Clean, legible.
- **Code**: Monospaced font for technical data.

### Colors (Tailwind Classes)
| Token | Purpose | Background | Foreground |
| :--- | :--- | :--- | :--- |
| `primary` | Main Actions | `bg-primary` (Black) | `text-primary-foreground` (White) |
| `secondary` | Secondary Actions | `bg-secondary` (Zinc 100) | `text-secondary-foreground` (Black) |
| `muted` | Subtext/Disable | `bg-muted` | `text-muted-foreground` (Grey) |
| `card` | Containers | `bg-card` (White) | `text-card-foreground` |
| `surface` | Elevated areas | `bg-surface` | `text-foreground` |

### Spacing & Radius
- **Border Radius**: Use `rounded-lg` (default `.5rem`).
- **Spacing**: Follow the 4px grid (`p-4`, `m-8`).

## Component Patterns

### 1. Interactive Cards
Cards must feel physical. Use `card-hover` for the subtle gradient reveal.

```tsx
<div className="group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-swiss transition-all hover:shadow-swiss-hover card-hover">
  <div className="p-6">
    <h3 className="font-display text-lg font-semibold">Card Title</h3>
    <p className="text-muted-foreground mt-2">Card content goes here.</p>
  </div>
</div>
```

### 2. Buttons
- **Primary**: Solid Black, White Text.
- **Secondary**: Light Grey, Black Text.
- **Ghost**: Transparent, Black Text (Hover: Light Grey).
- **Effect**: Add `.btn-press` for 0.98 scale on click.

```tsx
<button className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 btn-press">
  Action
</button>
```

### 3. Backgrounds (Landing/Hero)
Use the global animation classes for dynamic backgrounds.

```tsx
<div className="relative overflow-hidden bg-background">
  <div className="landing-orb landing-orb-1" />
  <div className="landing-orb landing-orb-2" />
  <div className="noise-overlay" />
  <div className="relative z-10">
    {/* Content */}
  </div>
</div>
```

## Micro-Interactions

- **Hover**: Use `.interactive-hover` for a consistent lift-and-shadow effect.
- **Focus**: Global focus ring is already set in `globals.css` (Zinc ring).
- **Transitions**: Default is `duration-250 ease-out`.

## Layout Stability (Anti-Shift)
To prevent the "jumping" effect when modals or dropdowns open (caused by the scrollbar hiding/showing), we enforce scrollbar stability.
- **Rule**: Always use `scrollbar-gutter: stable` on the `html` or `body` element.
- **Fix**: This ensures the layout doesn't shift horizontally by reserving the scrollbar space even when no scrollbar is present or when it's hidden by a modal.
- **Implementation**: Handled globally in `globals.css` under `@layer base`.

## Checklist for New UI

1. [ ] **Monochrome Check**: Are there any accidental blues or greens? (Remove them).
2. [ ] **Font Check**: Are headings using `font-display`?
3. [ ] **Depth Check**: Do clickable elements have hover states (shadow/lift)?
4. [ ] **Dark Mode**: Does the component look good in dark mode? (Zinc 900+ backgrounds).
5. [ ] **Mobile**: Is spacing responsive?

## Common Pitfalls
- **Don't**: Use default Tailwind colors like `bg-blue-500`.
- **Don't**: Use `shadow-md` directly; prefer semantic shadows.
- **Don't**: Create ad-hoc animations; use `animate-fade-in` or `animate-slide-up`.
