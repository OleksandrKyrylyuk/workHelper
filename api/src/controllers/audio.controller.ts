import { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "crypto";
import { PassThrough } from "stream";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import s3 from "../../config/s3.config.js";
import { db } from "../db/index.js";
import { audioFiles } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { transcriptionQueue } from "../queues/transcription.queue.js";

export async function uploadAudio(req: FastifyRequest, res: FastifyReply) {
    try {
        // Extract user_id from JWT token (Bearer token uses `sub` claim)
        const user = req.user as { sub?: string; id?: string; userId?: string } | undefined;
        const userId = user?.sub || user?.id || user?.userId || 'unknown';

        const files = req.files();
        let fileProcessed = false;
        let uploadedKey: string | null = null;

        for await (const file of files) {
            if (fileProcessed) {
                return res.code(400).send({ 
                    error: "Only one audio file can be uploaded at a time" 
                });
            }

            // Validate that it's an audio file
            if (!file.mimetype.startsWith('audio/')) {
                return res.code(400).send({ 
                    error: "Only audio files are allowed" 
                });
            }

            const safeFileName = file.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
            const fileKey = `audio/${Date.now()}-${randomUUID()}-${safeFileName}`;

            let size = 0;
            const counter = new PassThrough();
            counter.on("data", (chunk: Buffer) => { size += chunk.length; });
            file.file.pipe(counter);

            try {
                // Upload to S3
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
                uploadedKey = fileKey;

                // Save audio metadata to database
                const [audio] = await db.insert(audioFiles).values({
                    userId: userId,
                    filename: file.filename,
                    s3Key: fileKey,
                    contentType: file.mimetype,
                    size: size,
                    status: 'uploaded',
                }).returning();

                // Enqueue transcription job
                await transcriptionQueue.add('transcribe', {
                    audioId: audio.id,
                    s3Key: fileKey,
                    contentType: file.mimetype,
                });

                fileProcessed = true;

                return res.send({
                    success: true,
                    audio: {
                        id: audio.id,
                        filename: audio.filename,
                        s3Key: audio.s3Key,
                        contentType: audio.contentType,
                        size: audio.size,
                        status: audio.status,
                        createdAt: audio.createdAt
                    }
                });
            } catch (err) {
                // Cleanup: delete from S3 if database insert failed
                if (uploadedKey) {
                    await s3.send(new DeleteObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: uploadedKey
                    })).catch(() => {
                        req.log.error({ key: uploadedKey }, "S3 cleanup failed after database error");
                    });
                }

                req.log.error(err, "Audio upload failed");
                return res.code(500).send({ 
                    error: "Upload failed. Please try again." 
                });
            }
        }

        if (!fileProcessed) {
            return res.code(400).send({ error: "No audio file uploaded" });
        }
    } catch (err) {
        req.log.error(err, "Audio upload error");
        return res.code(500).send({ error: "Upload failed. Please try again." });
    }
}

export async function listAudios(req: FastifyRequest, res: FastifyReply) {
    try {
        const user = req.user as { sub?: string; id?: string; userId?: string } | undefined;
        const userId = user?.sub || user?.id || user?.userId || 'unknown';

        const records = await db.select({
            id: audioFiles.id,
            filename: audioFiles.filename,
            size: audioFiles.size,
            status: audioFiles.status,
            contentType: audioFiles.contentType,
            createdAt: audioFiles.createdAt,
            analysisS3Key: audioFiles.analysisS3Key,
        })
        .from(audioFiles)
        .where(eq(audioFiles.userId, userId))
        .orderBy(audioFiles.createdAt);

        return res.send({ success: true, audios: records });
    } catch (err) {
        req.log.error(err, "Failed to list audio files");
        return res.code(500).send({ error: "Failed to retrieve audio files." });
    }
}

export async function deleteAudio(
    req: FastifyRequest<{ Params: { id: string } }>,
    res: FastifyReply
) {
    try {
        const user = req.user as { sub?: string; id?: string; userId?: string } | undefined;
        const userId = user?.sub || user?.id || user?.userId || 'unknown';
        const { id } = req.params;

        const [record] = await db.select()
            .from(audioFiles)
            .where(eq(audioFiles.id, id));

        if (!record) {
            return res.code(404).send({ error: "Audio file not found." });
        }

        if (record.userId !== userId) {
            return res.code(403).send({ error: "Forbidden." });
        }

        // Delete audio file from S3
        await s3.send(new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: record.s3Key,
        })).catch(() => {
            req.log.error({ key: record.s3Key }, "S3 delete failed during audio deletion");
        });

        // Delete transcription text from S3 if it exists
        if (record.textS3Key) {
            await s3.send(new DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: record.textS3Key,
            })).catch(() => {
                req.log.error({ key: record.textS3Key }, "S3 delete failed for transcription text");
            });
        }

        // Delete analysis file from S3 if it exists
        if (record.analysisS3Key) {
            await s3.send(new DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: record.analysisS3Key,
            })).catch(() => {
                req.log.error({ key: record.analysisS3Key }, "S3 delete failed for analysis file");
            });
        }

        // Delete from database
        await db.delete(audioFiles).where(eq(audioFiles.id, id));

        return res.send({ success: true });
    } catch (err) {
        req.log.error(err, "Failed to delete audio file");
        return res.code(500).send({ error: "Failed to delete audio file." });
    }
}

export async function downloadAudioText(
    req: FastifyRequest<{ Params: { id: string } }>,
    res: FastifyReply
) {
    try {
        const user = req.user as { sub?: string; id?: string; userId?: string } | undefined;
        const userId = user?.sub || user?.id || user?.userId || 'unknown';
        const { id } = req.params;

        const [record] = await db.select()
            .from(audioFiles)
            .where(eq(audioFiles.id, id));

        if (!record) {
            return res.code(404).send({ error: "Audio file not found." });
        }

        if (record.userId !== userId) {
            return res.code(403).send({ error: "Forbidden." });
        }

        if (!record.textS3Key) {
            return res.code(400).send({ error: "Transcription is not available yet." });
        }

        const s3Response = await s3.send(new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: record.textS3Key,
        }));

        if (!s3Response.Body) {
            return res.code(500).send({ error: "Transcription file not found in storage." });
        }

        const chunks: Uint8Array[] = [];
        for await (const chunk of s3Response.Body as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
        }
        const text = Buffer.concat(chunks).toString('utf-8');

        const baseName = record.filename.replace(/\.[^.]+$/, '');
        res.header('Content-Type', 'text/plain; charset=utf-8');
        res.header('Content-Disposition', `attachment; filename="${baseName}.txt"`);
        return res.send(text);
    } catch (err) {
        req.log.error(err, "Failed to download transcription text");
        return res.code(500).send({ error: "Failed to download transcription text." });
    }
}

export async function downloadAnalysis(
    req: FastifyRequest<{ Params: { id: string } }>,
    res: FastifyReply
) {
    try {
        const user = req.user as { sub?: string; id?: string; userId?: string } | undefined;
        const userId = user?.sub || user?.id || user?.userId || 'unknown';
        const { id } = req.params;

        const [record] = await db.select()
            .from(audioFiles)
            .where(eq(audioFiles.id, id));

        if (!record) {
            return res.code(404).send({ error: "Audio file not found." });
        }

        if (record.userId !== userId) {
            return res.code(403).send({ error: "Forbidden." });
        }

        if (record.status !== 'analyzed' || !record.analysisS3Key) {
            return res.code(400).send({ error: "Analysis is not available yet." });
        }

        const s3Response = await s3.send(new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: record.analysisS3Key,
        }));

        if (!s3Response.Body) {
            return res.code(500).send({ error: "Analysis file not found in storage." });
        }

        const chunks: Uint8Array[] = [];
        for await (const chunk of s3Response.Body as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        const baseName = record.filename.replace(/\.[^.]+$/, '');
        res.header('Content-Type', 'application/pdf');
        res.header('Content-Disposition', `attachment; filename="${baseName}-analysis.pdf"`);
        return res.send(buffer);
    } catch (err) {
        req.log.error(err, "Failed to download analysis file");
        return res.code(500).send({ error: "Failed to download analysis file." });
    }
}
