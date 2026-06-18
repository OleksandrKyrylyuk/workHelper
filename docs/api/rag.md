# RAG System — API Instructions

Apply these rules when adding or modifying Retrieval-Augmented Generation (RAG) functionality under `api/`.

## Architecture Overview

The RAG pipeline is split into two phases: **ingestion** (async, queue-driven) and **retrieval** (sync, query-time).

```
POST /files/upload
       │
       ▼
[file.controller] ──► S3 (raw file stored)
       │
       ▼
[documents table] ── status: "uploaded"
       │
       ▼
[ingestionQueue] ── BullMQ job { documentId, s3Key, mimeType }
       │
       ▼
[ingestion.worker] ── downloads from S3
       │
       ▼
[parser.utils] ── extracts plain text
       │
       ▼
[rag.service] ── chunks → embeds → upserts to Qdrant
       │
       ▼
[documents table] ── status: "indexed" (or "failed")
```

| Layer | File | Responsibility |
|---|---|---|
| Qdrant client | `api/config/qdrant.config.ts` | Singleton `QdrantClient` |
| Redis client | `api/config/redis.config.ts` | Singleton `Redis` (ioredis) for BullMQ |
| Queue | `api/src/queues/ingestion.queue.ts` | BullMQ `Queue` — enqueues ingestion jobs |
| Worker | `api/src/queues/ingestion.worker.ts` | BullMQ `Worker` — runs the full pipeline |
| RAG service | `api/src/services/rag.service.ts` | Chunks, embeds, and upserts into Qdrant |
| Text parser | `api/src/utils/parser.utils.ts` | Extracts plain text from PDF / DOCX / TXT |
| Chunk ID util | `api/src/utils/hash.utils.ts` | Deterministic UUID from `documentId + chunkIndex` |
| DB schema | `api/src/db/schema.ts` | `documents` table with status lifecycle |

---

## Required Environment Variables

Read at startup; never hardcode values.

```
OPENAI_API_KEY=          # Used for text-embedding-3-small
QDRANT_URL=              # e.g. http://localhost:6333
REDIS_URL=               # e.g. redis://localhost:6379
S3_BUCKET_NAME=          # used by worker to download files
```

---

## Document Status Lifecycle

The `documents.status` column drives pipeline state. Valid transitions:

```
uploaded → processing → indexed
                     ↘ failed
```

- Set `processing` at the start of the worker job (before any I/O).
- Set `indexed` only after Qdrant upsert succeeds.
- Set `failed` in the `catch` block, then re-throw the error so BullMQ can retry.
- Never skip the status update — consumers depend on it to know document readiness.

---

## Ingestion Queue (BullMQ)

### Job shape

```ts
interface IngestionJobData {
    documentId: string;   // UUID from documents table
    s3Key: string;        // S3 object key
    mimeType: string;     // MIME type of the original file
}
```

### Queue configuration

```ts
defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
}
```

- Do not change `attempts` or `backoff` without documenting why.
- The queue name is `'ingestion'` — use this string consistently in both queue and worker.
- Use the shared Redis singleton from `api/config/redis.config.ts` **only if** the connection shape matches BullMQ's `ConnectionOptions` (`{ url }` object). The queue and worker currently use their own inline `{ url }` object — keep both consistent.

### Worker pattern

- Export a factory function `createIngestionWorker()` — do not instantiate the worker at module load time.
- Attach `completed` and `failed` event listeners inside the factory for observability.
- The worker must re-throw errors after marking the document as `failed` so BullMQ retries the job.

---

## Qdrant Vector Store

### Collection

- Collection name: `'documents'` (constant in `rag.service.ts`).
- Vector size: `1536` (matches `text-embedding-3-small`).
- Distance metric: `Cosine`.
- Call `ensureCollection()` at the top of `indexDocument` — it is idempotent and safe to call on every ingestion.
- Do not create additional collections without updating `COLLECTION_NAME`.

### Point structure

Each chunk becomes one Qdrant point:

```ts
{
    id: chunkPointId(documentId, i),  // deterministic UUID
    vector: number[],                  // 1536-dim embedding
    payload: {
        documentId: string,
        chunkIndex: number,
        text: string,                  // raw chunk text stored for retrieval
    }
}
```

- Always store `text` in the payload so retrieval can return context without a second DB lookup.
- Use `qdrant.upsert(..., { wait: true })` so the operation is confirmed before returning.

### Chunk ID generation

Use `chunkPointId(documentId, index)` from `api/src/utils/hash.utils.ts`.  
It produces a deterministic UUID via `sha1(documentId:index)` — re-indexing the same document will overwrite existing points instead of duplicating them.

Do not generate chunk IDs any other way.

---

## Text Chunking and Embedding

### Chunking

Use `SentenceSplitter` from `llamaindex`:

```ts
new SentenceSplitter({ chunkSize: 512, chunkOverlap: 50 })
```

- Do not change `chunkSize` or `chunkOverlap` without considering the downstream embedding model's token limit.
- Wrap the raw text in a `Document` object with `id_: documentId` before splitting.

### Embedding

Use `OpenAIEmbedding` from `@llamaindex/openai`:

```ts
new OpenAIEmbedding({ model: 'text-embedding-3-small', apiKey: process.env.OPENAI_API_KEY })
```

- Model is fixed at `text-embedding-3-small` (1536 dims). If the model changes, `VECTOR_SIZE` and the Qdrant collection must be updated together.
- Embed chunks one at a time inside a `for` loop (`getTextEmbedding`). Batch embedding is allowed in the future but requires matching the point array construction.
- Do not import or instantiate `OpenAIEmbedding` outside `rag.service.ts`.

---

## Text Extraction

`api/src/utils/parser.utils.ts` exports `extractText(buffer, mimeType)`.

| MIME type | Library | Notes |
|---|---|---|
| `application/pdf` | `pdf-parse` (`PDFParse`) | Call `.destroy()` after use |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `mammoth` | `.extractRawText({ buffer })` |
| `application/msword` | `mammoth` | Same as above |
| `text/plain`, `text/markdown`, `text/x-markdown` | native | `buffer.toString('utf-8')` |

- Unsupported MIME types throw — the worker catches this and marks the document `failed`.
- Add new MIME type support to `parser.utils.ts` only; do not duplicate extraction logic elsewhere.

---

## Singleton Clients

| Client | Config file | Import path |
|---|---|---|
| `QdrantClient` | `api/config/qdrant.config.ts` | `../../config/qdrant.config.js` |
| `Redis` (ioredis) | `api/config/redis.config.ts` | `../../config/redis.config.js` |
| `S3Client` | `api/config/s3.config.ts` | `../../config/s3.config.js` |

- Never instantiate these clients outside their config files.
- Redis client sets `maxRetriesPerRequest: null` — this is required by BullMQ and must not be removed.

---

## Adding Retrieval (Query-Time)

When implementing the retrieval half of RAG (not yet built):

- Add a `queryDocuments(query: string, topK: number)` function to `api/src/services/rag.service.ts`.
- Embed the query with the **same** model (`text-embedding-3-small`) and search with `qdrant.search(COLLECTION_NAME, { vector, limit: topK })`.
- Return point payloads (`text`, `documentId`, `chunkIndex`) — do not expose raw Qdrant response objects to controllers.
- Wire retrieval through a controller and route following the same layer split as file upload.

---

## Dependencies

The following packages are already installed — do not add alternatives:

- `llamaindex` — `Document`, `SentenceSplitter`
- `@llamaindex/openai` — `OpenAIEmbedding`
- `@qdrant/js-client-rest` — `QdrantClient`
- `bullmq` — `Queue`, `Worker`
- `ioredis` — `Redis`
- `pdf-parse` — PDF text extraction
- `mammoth` — DOCX text extraction

---

## Do Not

- Do not buffer S3 objects in memory beyond what is needed for text extraction (small files only — see worker).
- Do not create new `QdrantClient`, `Redis`, or `S3Client` instances outside their config files.
- Do not change the Qdrant collection name or vector size without migrating existing data.
- Do not skip `ensureCollection()` — collection absence causes upsert to fail silently on some client versions.
- Do not expose raw Qdrant or OpenAI SDK errors in API responses.
- Do not enqueue a job before the database row is committed — the worker depends on the row existing.
