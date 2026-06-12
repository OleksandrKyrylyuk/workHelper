# Component Authoring Rules

Apply these rules when writing any React component in `web/`.

## Server vs Client Components

- **Default to Server Components** — they run only on the server and have no JS bundle cost.
- Add `"use client"` at the top of the file **only** when the component needs:
  - React hooks (`useState`, `useEffect`, `useRef`, etc.)
  - Event handlers (`onClick`, `onChange`, etc.)
  - Browser-only APIs (`window`, `document`, `localStorage`, etc.)
  - Third-party client-only libraries

```tsx
// Server Component (default) — no directive needed
export function FileList({ files }: { files: string[] }) {
  return <ul>{files.map(f => <li key={f}>{f}</li>)}</ul>
}

// Client Component — needs interactivity
"use client"
import { useState } from "react"

export function UploadButton() {
  const [loading, setLoading] = useState(false)
  // ...
}
```

## Props and TypeScript

- Use `React.ComponentProps<"element">` to inherit all native HTML props — avoid re-declaring them:

```tsx
// ✅ Correct
function Card({ className, children, ...props }: React.ComponentProps<"div">) { ... }

// ❌ Avoid
function Card({ className, onClick, style, children }: { className?: string; onClick?: () => void; ... }) { ... }
```

- Always accept a `className` prop and merge it with `cn()` so callers can extend styles:

```tsx
import { cn } from "@/lib/utils"

function Section({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("py-8 px-4", className)} {...props} />
}
```

- Export named functions, not anonymous arrow functions, so they appear correctly in React DevTools.

## Component File Structure

```
web/components/
  ui/                        ← shadcn CLI-managed (don't create files here manually)
  <feature-name>.tsx         ← Single component or small group
  <feature-name>/
    index.tsx                ← Public export
    <sub-component>.tsx      ← Internal pieces
```

One component per file unless components are tightly coupled and under ~100 lines combined.

## Accessibility

- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<header>`, `<footer>`).
- Every interactive element must be keyboard-reachable and have a visible focus indicator.
- Images must have meaningful `alt` text; decorative images use `alt=""`.
- Form inputs must have associated `<label>` elements (use shadcn `FormLabel`).
- Use `aria-*` attributes to describe dynamic state:

```tsx
<button aria-expanded={isOpen} aria-controls="menu">Toggle</button>
```

## Loading and Error States

- Show a `Skeleton` component (from shadcn) while data is loading.
- Show an `Alert` or inline error message on failure — never silently fail.
- Disable submit buttons while async actions are in progress using `disabled` + `aria-disabled`.

```tsx
import { Skeleton } from "@/components/ui/skeleton"

function FileListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-md" />
      ))}
    </div>
  )
}
```

## Custom Hooks

Extract reusable stateful logic into `web/hooks/`:

```
web/hooks/
  use-file-upload.ts
  use-debounce.ts
```

```tsx
// web/hooks/use-file-upload.ts
"use client"
import { useState } from "react"

export function useFileUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(files: FileList) {
    setUploading(true)
    setError(null)
    try {
      // call API
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading, error }
}
```

## Anti-patterns

| ❌ Avoid | ✅ Use instead |
|---|---|
| Inline `style={{}}` for layout | Tailwind utility classes |
| `any` typed props | Explicit types or `React.ComponentProps` |
| Prop drilling more than 2 levels | Context or lift state up |
| `useEffect` for data fetching | Server Components or Next.js `fetch` |
| Anonymous default exports | Named function exports |
| Logic inside JSX return | Extract to variables or sub-components |

