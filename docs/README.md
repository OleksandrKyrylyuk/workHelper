# Agent Instructions Layout

This directory holds modular instruction files for coding agents.

## Files

- `common.md` - rules shared by `web/` and `api/`.
- `web/agent.md` - Next.js architecture and conventions (entry point for web).
- `web/tailwind.md` - Tailwind CSS v4 styling rules and design tokens.
- `web/shadcn.md` - shadcn/ui component installation and usage rules.
- `web/components.md` - React component authoring, accessibility, and patterns.
- `api/agent.md` - Fastify-specific instructions.
- `api/FILE_API.md` - File upload/download API documentation.

## How to Use

1. Always read `../AGENTS.md` first.
2. Always read `common.md`.
3. Read one or both area guides based on the files you are editing.
4. For web UI work, also read the specific sub-guides (`tailwind.md`, `shadcn.md`, `components.md`).

## UI Development Quick Reference

When building UI in `web/`:

| Task | How |
|---|---|
| Add a new shadcn component | `npx shadcn@latest add <name>` from `web/` |
| Style an element | Tailwind utility classes + `cn()` helper |
| Use an icon | `lucide-react` (already installed) |
| Compose a feature component | Create in `web/components/` (not `ui/`) |
| Add a custom hook | Create in `web/hooks/` |
| Shared utility function | Add to `web/lib/utils.ts` |

See `web/shadcn.md`, `web/tailwind.md`, and `web/components.md` for the full rulesets.
