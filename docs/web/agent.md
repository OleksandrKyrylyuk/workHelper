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

## Data, Side Effects, and Security

- Validate assumptions around caching/revalidation against current Next docs before implementing data fetching.
- Keep secrets server-side only; never expose env vars to clients unless intentionally public.
- Avoid client-side data fetching for secure or privileged operations when server alternatives exist.

## File and Folder Conventions

| Path | Purpose |
|---|---|
| `web/app/` | Pages, layouts, route segments |
| `web/components/ui/` | Raw shadcn primitives (CLI-managed, do not edit manually) |
| `web/components/` | Feature and composed components |
| `web/lib/utils.ts` | `cn()` and other framework-agnostic utilities |
| `web/hooks/` | Custom React hooks |

## Aliases (from `components.json`)

| Alias | Resolves to |
|---|---|
| `@/components` | `web/components/` |
| `@/components/ui` | `web/components/ui/` |
| `@/lib` | `web/lib/` |
| `@/hooks` | `web/hooks/` |

## Web Quality Gate

Run from `web/` when code changes are made:

- `npm run lint`
- `npm run build`
