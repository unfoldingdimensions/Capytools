# Design Tokens & System

## Colors
Defined in `app/globals.css` as CSS variables and mapped in `tailwind.config.ts`.

### Semantic Colors
- **Primary**: Brand Indigo (`bg-brand-600`)
- **Secondary**: Slate (`bg-secondary`)
- **Destructive**: Red (`bg-destructive`)
- **Background**: `bg-background` (Light: Gray-50, Dark: Gray-950)

## Animations
Standardized timing and easing functions.

### Durations
- `--duration-fast`: 150ms
- `--duration-normal`: 250ms
- `--duration-slow`: 400ms

### Keyframes
- `fade-in`: Opacity 0 -> 1
- `scale-in`: Scale 0.95 -> 1, Opacity 0 -> 1
- `spin-fast`: 0deg -> 360deg

### Utility Classes
- `.animate-fade-in`: Standard fade entry.
- `.animate-scale-in`: Standard modal/popover entry.
- `.interactive-hover`: Standard hover effect (Scale + Shadow + Lift).
  - Usage: `className="interactive-hover"` on Cards or Buttons.

## Shadows
- `shadow-swiss`: Soft, diffused shadow for cards (`0 8px 32px -4px rgba(0, 0, 0, 0.05)`).
- `shadow-sm`, `shadow-md`, `shadow-lg`: Standard hierarchy.

## Typography
- **Headings**: `font-display` (Plus Jakarta Sans)
- **Body**: `font-sans` (Inter)
