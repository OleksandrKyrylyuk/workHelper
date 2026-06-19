# Common Coding Standards (Web + API)

Use these standards for all changes in this repository.

## Scope and Safety

- Keep changes small and focused on the request.
- Do not refactor unrelated code unless explicitly asked.
- Preserve existing behavior unless the task asks for a behavior change.
- If requirements are unclear, ask before implementing risky assumptions.

## TypeScript Rules

- Prefer explicit types for public function inputs/outputs.
- Avoid `any`; use `unknown` and narrow safely when needed.
- Keep modules ESM-compatible and import paths consistent with existing code.
- Reuse existing types and utilities before creating new abstractions.

## Code Style

- Follow existing file naming and directory conventions.
- Use clear, intention-revealing names for functions and variables.
- Keep functions small; separate transport logic from business logic.
- Add brief comments only for non-obvious decisions.

## Error Handling and Logging

- Fail fast with actionable errors.
- Never leak secrets or sensitive env values in logs or responses.
- Return structured, consistent errors at API boundaries.
- Use typed result objects for actions: `{ success: boolean; error?: string }`.

## Authentication and Authorization

- **Web**: Use JWT-based session auth via `@/lib/auth`. Session stored in HTTP-only cookie.
- **API**: Use `@fastify/jwt` for token verification; see `api/src/plugins/auth.plugin.ts`.
- **RBAC**: Support `admin` and `user` roles; enforce with guard functions (e.g., `requireAdmin()`).
- Check session/role at the edge (server actions, API routes) before performing privileged operations.
- Never expose sensitive user data to unauthorized roles.

## Dependencies and Tooling

- Prefer existing dependencies already used by the project.
- Do not add new packages unless required and justified.
- Update package manifests and lockfiles whenever dependencies change.
- When adding UI components in `web/`, use the shadcn CLI (`npx shadcn@latest add <component>`) rather than installing raw packages manually.

## Database and Data Persistence

- Use **Drizzle ORM** for schema definitions and type-safe queries.
- Database schemas live in `web/lib/auth/schema.ts` (web) or relevant API schema files.
- Use `pool.query()` for direct SQL when ORM is unnecessary or verbose.
- **Soft delete pattern**: Add `deleted_at` timestamp column instead of hard deletes; filter by `WHERE deleted_at IS NULL`.
- Run migrations via `drizzle-kit` when schema changes occur.

## UI Standards (web/ only)

- Use **shadcn/ui** components as the primary building block for all UI.
- Use **Tailwind CSS** utilities for all styling — no inline styles, no custom CSS files unless essential.
- Use the `cn()` helper from `@/lib/utils` to merge conditional class names.
- Use design tokens (`bg-background`, `text-foreground`, etc.) — never hardcode colors.
- Follow mobile-first responsive design with Tailwind breakpoint prefixes.
- See `docs/web/agent.md` for full UI rules.

## Validation Checklist Before Finishing

- Project scripts relevant to the change pass (lint/build/test where applicable).
- New behavior is covered by tests or documented if tests are unavailable.
- No unrelated file churn.
