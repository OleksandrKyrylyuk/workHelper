# S3 File Upload — API Instructions

Apply these rules when adding or modifying file upload functionality under `api/`.

## Architecture Overview

| Layer | File | Responsibility |
|---|---|---|
| S3 client | `api/config/s3.config.ts` | Creates and exports a singleton `S3Client` |
| Controller | `api/src/controllers/file.controller.ts` | Streams files to S3, handles cleanup on failure |
| Routes | `api/src/routes/file.routes.ts` | Registers upload routes under `/files` |
| Bootstrap | `api/src/index.ts` | Registers `@fastify/multipart` plugin with global limits |

## Required Environment Variables

These must be present at startup. Never hardcode values.

```
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
```

## S3 Client

- Singleton lives in `api/config/s3.config.ts` — import it from there, do not create new `S3Client` instances elsewhere.
- Credentials and region are read from env vars; the config file applies no defaults beyond empty strings.

## Multipart Plugin

`@fastify/multipart` is registered once in `index.ts` with these global limits:

- `fileSize`: 10 MB (`10 * 1024 * 1024`)
- `files`: 10 per request

Do not re-register the plugin in route plugins. Adjust limits only in `index.ts` and document the reason.

## Uploading Files

Use `@aws-sdk/lib-storage` `Upload` (not `PutObjectCommand`) for all uploads — it handles multipart upload chunking automatically.

### Key naming convention

```ts
const safeFileName = file.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
const fileKey = `uploads/${Date.now()}-${randomUUID()}-${safeFileName}`;
```

- Always sanitize filenames before using them in S3 keys.
- Prefix all keys with a path segment (e.g. `uploads/`) to keep the bucket organised.
- Include `Date.now()` and `randomUUID()` to guarantee uniqueness.

### Streaming pattern

Pipe the incoming file stream through a `PassThrough` to count bytes without buffering the file in memory:

```ts
const counter = new PassThrough();
counter.on("data", (chunk: Buffer) => { size += chunk.length; });
file.file.pipe(counter);

const upload = new Upload({
    client: s3,
    params: {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileKey,
        Body: counter,
        ContentType: file.mimetype
    }
});

await upload.done();
```

## Partial Upload Cleanup

If an error occurs mid-loop (multiple files), delete any already-uploaded objects before returning an error response:

```ts
await s3.send(new DeleteObjectsCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Delete: { Objects: uploadedFiles.map(f => ({ Key: f.key })) }
})).catch(() => {
    req.log.error({ keys: uploadedFiles.map(f => f.key) }, "S3 cleanup failed after partial upload");
});

return res.code(500).send({ error: "Upload failed. No files were saved." });
```

- Never throw from the cleanup `.catch()` — log the failure and continue returning the original error.

## Response Shape

Successful upload:

```json
{
  "message": "Files uploaded successfully",
  "count": 2,
  "files": [
    { "originalName": "report.pdf", "key": "uploads/...", "contentType": "application/pdf", "size": 204800 }
  ]
}
```

Error responses:

| Condition | Status | Body |
|---|---|---|
| No files in request | `400` | `{ "error": "No files uploaded" }` |
| Upload failure | `500` | `{ "error": "Upload failed. No files were saved." }` |

## Route Registration

Routes are registered in `api/src/routes/file.routes.ts` under the `/files` prefix:

```
POST /files/upload   → uploadFiles controller
```

Add new file-related routes to this file. Keep the prefix `/files`.

## Dependencies

The following packages are already installed — do not add alternatives:

- `@aws-sdk/client-s3` — `S3Client`, `DeleteObjectsCommand`
- `@aws-sdk/lib-storage` — `Upload`
- `@fastify/multipart` — multipart form parsing

## Do Not

- Do not buffer entire files in memory (`file.toBuffer()`) — always stream.
- Do not create new `S3Client` instances outside `config/s3.config.ts`.
- Do not expose raw S3 errors or AWS SDK error objects to API responses.
- Do not skip filename sanitization before constructing S3 keys.
