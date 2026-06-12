# Tailwind CSS Instructions

Apply these rules whenever writing or modifying styles in `web/`.

## Setup

This project uses **Tailwind CSS v4** loaded via a single import in `web/app/globals.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
```

No `tailwind.config.js` is needed — configuration lives inside `globals.css` using the `@theme inline` block.

## Core Rules

- Use Tailwind utility classes directly in JSX — do **not** write custom CSS unless there is no utility equivalent.
- Compose multiple utilities with the `cn()` helper from `@/lib/utils` (backed by `clsx` + `tailwind-merge`):

```tsx
import { cn } from "@/lib/utils"

<div className={cn("base-class", condition && "conditional-class", className)} />
```

- Always accept and forward `className` in custom components so callers can extend styles.

## Design Tokens

The project exposes design tokens as CSS variables through `@theme inline`. **Always use token-based classes — never hardcode raw colors.**

| Token class | Usage |
|---|---|
| `bg-background` / `text-foreground` | Page background and default text |
| `bg-card` / `text-card-foreground` | Card surfaces |
| `bg-muted` / `text-muted-foreground` | Subtle backgrounds and secondary text |
| `bg-primary` / `text-primary-foreground` | Primary actions |
| `bg-secondary` / `text-secondary-foreground` | Secondary actions |
| `bg-destructive` | Destructive / error states |
| `border-border` | Default borders |
| `ring-ring` | Focus rings |

## Dark Mode

The project uses the **`.dark` class strategy**. Always add `dark:` variants when a style looks different in dark mode:

```tsx
<div className="bg-white dark:bg-zinc-900 text-black dark:text-white" />
```

Use token classes wherever possible — they already switch between light and dark values automatically.

## Responsive Design

Follow **mobile-first** design. Add breakpoint prefixes only when the layout changes at larger sizes:

| Prefix | Min-width |
|---|---|
| `sm:` | 640px |
| `md:` | 768px |
| `lg:` | 1024px |
| `xl:` | 1280px |
| `2xl:` | 1536px |

```tsx
<div className="flex flex-col md:flex-row gap-4" />
```

## Arbitrary Values

Avoid arbitrary values like `w-[372px]` or `text-[13px]`. Use them only when:
- No token or utility maps to the required value, AND
- The value comes from a design spec and will not change

## Spacing and Sizing

Prefer Tailwind's spacing scale (`p-4`, `gap-2`, `mt-6`, etc.) over custom values. The radius scale is available via tokens:

| Token | Value |
|---|---|
| `rounded-sm` | `calc(var(--radius) * 0.6)` |
| `rounded-md` | `calc(var(--radius) * 0.8)` |
| `rounded-lg` | `var(--radius)` |
| `rounded-xl` | `calc(var(--radius) * 1.4)` |

## Anti-patterns

| ❌ Avoid | ✅ Use instead |
|---|---|
| `style={{ color: "#fff" }}` | `text-white` or `text-foreground` |
| Custom `.css` class for layout | Tailwind utilities |
| `text-[#333]` hardcoded color | `text-foreground` or `text-muted-foreground` |
| `w-[372px]` without justification | `w-96` or nearest spacing token |

