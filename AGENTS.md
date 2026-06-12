# WorkHelper Agent Instructions

This file is the entry point for LLM coding instructions in this repository.

## Instruction Loading Order

1. Read `docs/common.md` for standards that apply to the whole monorepo.
2. If touching the web app, also read `docs/web/agent.md`.
3. If touching the API, also read `docs/api/agent.md`.
4. If a task spans both projects, follow both area-specific guides and prefer the stricter rule when conflicts exist.

## Repository Areas

- `web/` - Next.js frontend (React + App Router)
- `api/` - Fastify backend

## Hard Requirements

- Do not assume framework behavior from memory when project docs say otherwise.
- Make minimal, scoped changes and preserve existing architecture.
- Keep code TypeScript-first, lint-friendly, and production-safe.
- Add/adjust tests when behavior changes.
