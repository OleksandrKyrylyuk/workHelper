# Web Agent Instructions (Next.js)

Apply these rules when editing files under `web/`.

## Instruction Files

When working on the web app, read the relevant guide(s) below in addition to this file:

| File | When to read |
|---|---|
| `docs/web/tailwind.md` | Any styling or layout change |
| `docs/web/shadcn.md` | Adding or using UI components |
| `docs/web/components.md` | Writing or modifying React components |

## Mandatory Framework Rule

This project uses a Next.js version with breaking changes.

- Before writing or changing Next.js code, read the relevant guide in `web/node_modules/next/dist/docs/`.
- Follow deprecation notices from those docs.
- If docs and memory conflict, trust project docs.

## Architecture and Conventions

- Prefer App Router conventions used by the current project structure (`web/app/`).
- Default to Server Components; add `"use client"` only when interactivity/browser APIs require it.
- Keep page/layout files thin and move reusable UI logic into `web/components/`.
- Keep utility functions framework-agnostic in `web/lib/`.

## Server Actions Pattern

- Place server actions in `web/lib/actions/` with `'use server'` directive at the top.
- Export typed interfaces for inputs and return values.
- Return structured results: `{ success: boolean; error?: string }` or typed data objects.
- Call `revalidatePath()` after mutations to invalidate Next.js cache.
- Example structure:
  ```ts
  'use server'
  export interface ActionResult {
    success: boolean
    error?: string
  }
  export async function myAction(): Promise<ActionResult> {
    // ... logic
    revalidatePath('/path')
    return { success: true }
  }
  ```

## Data, Side Effects, and Security

- Validate assumptions around caching/revalidation against current Next docs before implementing data fetching.
- Keep secrets server-side only; never expose env vars to clients unless intentionally public.
- Avoid client-side data fetching for secure or privileged operations when server alternatives exist.
- **Fetch data in server components** and pass as props to client components.
- Use server actions (`'use server'`) for all data mutations (create, update, delete).
- Protect sensitive operations with auth checks (e.g., `await requireAdmin()`).

## Database Access in Web

- Import `pool` or `db` from `@/lib/db`.
- Use Drizzle ORM (`db`) for type-safe queries or `pool.query()` for raw SQL.
- Apply soft delete pattern: filter `WHERE deleted_at IS NULL` when querying active records.
- Type query results explicitly to match schema expectations.

## File and Folder Conventions

| Path | Purpose |
|---|---|
| `web/app/` | Pages, layouts, route segments |
| `web/components/ui/` | Raw shadcn primitives (CLI-managed, do not edit manually) |
| `web/components/` | Feature and composed components |
| `web/lib/actions/` | Server actions (data mutations, `'use server'`) |
| `web/lib/auth/` | Authentication utilities and session management |
| `web/lib/utils.ts` | `cn()` and other framework-agnostic utilities |
| `web/hooks/` | Custom React hooks |

## Aliases (from `components.json`)

| Alias | Resolves to |
|---|---|
| `@/components` | `web/components/` |
| `@/components/ui` | `web/components/ui/` |
| `@/lib` | `web/lib/` |
| `@/lib/actions` | `web/lib/actions/` |
| `@/lib/auth` | `web/lib/auth/` |
| `@/hooks` | `web/hooks/` |

## Web Quality Gate

Run from `web/` when code changes are made:

- `npm run lint`
- `npm run build`
