# Web Agent Instructions (Next.js)

Apply these rules when editing files under `web/`.

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

## Styling and UI

- Follow existing Tailwind usage and utility composition patterns.
- Reuse existing UI building blocks in `web/components/ui/` before creating new primitives.
- Keep accessibility in mind (semantic HTML, labels, keyboard interactions).

## Web Quality Gate

Run from `web/` when code changes are made:

- `npm run lint`
- `npm run build`

