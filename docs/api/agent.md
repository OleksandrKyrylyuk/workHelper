# API Agent Instructions (Fastify)

Apply these rules when editing files under `api/`.

## Structure and Routing

- Keep route registration in `api/src/routes/`.
- Keep request handlers/controllers in `api/src/controllers/`.
- Keep startup/bootstrap concerns in `api/src/index.ts`.
- Prefer one responsibility per module.

## Handler Design

- Validate and narrow inputs at the edge (params, query, body).
- Return stable JSON response shapes for API endpoints.
- Do not send raw error objects to clients.
- Use appropriate HTTP status codes and consistent error messages.
- Use typed result objects: `{ success: boolean; error?: string; data?: T }`.

## Authentication in API

- JWT tokens handled via `@fastify/jwt` (registered in `api/src/plugins/auth.plugin.ts`).
- Protect routes with `requireAuth` preHandler hook or equivalent.
- Verify tokens with `await request.jwtVerify()` before processing sensitive requests.
- Return `401 Unauthorized` with `{ error: 'Unauthorized' }` for invalid/missing tokens.

## Fastify Practices

- ALWAYS use Fastify patterns over ad-hoc abstractions.
- Keep route plugins async and typed.
- Register plugins/routes with explicit prefixes.
- Keep controller logic framework-light when possible for easier testing.
- **Use `fastify-plugin` (fp)** to wrap plugins that need to share decorators/hooks with parent scope.
- Example:
  ```ts
  import fp from 'fastify-plugin'
  async function myPluginCore(fastify: FastifyInstance) { /* ... */ }
  export const myPlugin = fp(myPluginCore)
  ```

## Runtime and Config

- Read environment variables once and validate required keys on startup.
- Do not hardcode secrets or deployment-specific values.
- Keep defaults safe for local development.

## Feature-Specific Guides

| Feature | Guide |
|---|---|
| File upload (S3 + multipart) | `docs/api/s3-file-upload.md` |
| RAG pipeline (ingestion + embeddings + Qdrant) | `docs/api/rag.md` |

## API Quality Gate

Run from `api/` when code changes are made:

- `npm run build`
- `npm run dev` (smoke test endpoint behavior)

