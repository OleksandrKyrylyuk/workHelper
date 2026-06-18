import { Worker } from 'bullmq';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import s3 from '../../config/s3.config.js';
import { db } from '../db/index.js';
import { documents } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { extractText } from '../utils/parser.utils.js';
import { indexDocument } from '../services/rag.service.js';
import type { IngestionJobData } from './ingestion.queue.js';

const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

async function downloadFromS3(s3Key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
    });

    const response = await s3.send(command);

    if (!response.Body) {
        throw new Error(`Empty body from S3 for key: ${s3Key}`);
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks);
}

export function createIngestionWorker() {
    const worker = new Worker<IngestionJobData>(
        'ingestion',
        async (job) => {
            const { documentId, s3Key, mimeType } = job.data;

            // Mark as processing
            await db.update(documents)
                .set({ status: 'processing', updatedAt: new Date() })
                .where(eq(documents.id, documentId));

            try {
                // Download from S3
                const buffer = await downloadFromS3(s3Key);

                // Extract text
                const text = await extractText(buffer, mimeType);

                // Chunk, embed and store in Qdrant
                await indexDocument(documentId, text);

                // Mark as indexed
                await db.update(documents)
                    .set({ status: 'indexed', updatedAt: new Date() })
                    .where(eq(documents.id, documentId));
            } catch (err) {
                // Mark as failed
                await db.update(documents)
                    .set({ status: 'failed', updatedAt: new Date() })
                    .where(eq(documents.id, documentId));

                throw err;
            }
        },
        { connection: connection }
    );

    worker.on('completed', (job) => {
        console.log(`Ingestion job ${job.id} completed for document ${job.data.documentId}`);
    });

    worker.on('failed', (job, err) => {
        console.error(`Ingestion job ${job?.id} failed for document ${job?.data.documentId}:`, err);
    });

    return worker;
}
