import { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "crypto";
import { PassThrough } from "stream";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import s3 from "../../config/s3.config.js";
import { db } from "../db/index.js";
import { audioFiles } from "../db/schema.js";

export async function uploadAudio(req: FastifyRequest, res: FastifyReply) {
    try {
        // Extract user_id from JWT token
        const user = req.user as { id?: string; userId?: string } | undefined;
        const userId = user?.id || user?.userId || 'unknown';

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
