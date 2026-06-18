import { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "crypto";
import { PassThrough } from "stream";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import s3 from "../../config/s3.config.js";
import { db } from "../db/index.js";
import { documents } from "../db/schema.js";
import { ingestionQueue } from "../queues/ingestion.queue.js";

export async function uploadFiles(req: FastifyRequest, res: FastifyReply) {
    const uploadedFiles: { originalName: string; key: string; contentType: string; size: number; documentId: string }[] = [];

    const files = req.files();

    try {
        for await (const file of files) {
            const safeFileName = file.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
            const fileKey = `uploads/${Date.now()}-${randomUUID()}-${safeFileName}`;

            let size = 0;
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

            // Save document metadata
            const [doc] = await db.insert(documents).values({
                filename: file.filename,
                s3Key: fileKey,
                mimeType: file.mimetype,
                status: 'uploaded',
            }).returning();

            // Enqueue ingestion job
            await ingestionQueue.add('ingest', {
                documentId: doc.id,
                s3Key: fileKey,
                mimeType: file.mimetype,
            });

            uploadedFiles.push({
                originalName: file.filename,
                key: fileKey,
                contentType: file.mimetype,
                size,
                documentId: doc.id,
            });
        }
    } catch (err) {
        if (uploadedFiles.length > 0) {
            await s3.send(new DeleteObjectsCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Delete: { Objects: uploadedFiles.map(f => ({ Key: f.key })) }
            })).catch(() => {
                req.log.error({ keys: uploadedFiles.map(f => f.key) }, "S3 cleanup failed after partial upload");
            });
        }

        return res.code(500).send({ error: "Upload failed. No files were saved." });
    }

    if (uploadedFiles.length === 0) {
        return res.code(400).send({ error: "No files uploaded" });
    }

    return {
        message: "Files uploaded successfully",
        count: uploadedFiles.length,
        files: uploadedFiles
    };
}