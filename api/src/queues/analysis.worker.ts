import { Worker } from 'bullmq';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import OpenAI from 'openai';
import s3 from '../../config/s3.config.js';
import { db } from '../db/index.js';
import { audioFiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { AnalysisJobData } from './analysis.queue.js';
import { buildCallAnalysisMessages } from "../promts/analyse.promt.js";
import {  buildCallAnalysisMessagesBig } from "../promts/analyse-big.promt.js";
import { generateCallAnalysisPdf } from "../utils/generate-pdf.utils.js";
import { generateCallAnalysisPdfBig } from "../utils/generate-pdf-big.utils.js";

const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

async function downloadText(s3Key: string): Promise<string> {
    const response = await s3.send(new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
    }));
    if (!response.Body) throw new Error(`Empty body from S3 for key: ${s3Key}`);
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
}

export function createAnalysisWorker() {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const worker = new Worker<AnalysisJobData>(
        'analysis',
        async (job) => {
            const { audioId, textS3Key } = job.data;

            await db.update(audioFiles)
                .set({ status: 'analyzing', updatedAt: new Date() })
                .where(eq(audioFiles.id, audioId));

            try {
                // Fetch filename from DB
                const [record] = await db.select({ filename: audioFiles.filename })
                    .from(audioFiles)
                    .where(eq(audioFiles.id, audioId));

                const transcriptionText = await downloadText(textS3Key);

                const chatResponse = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: buildCallAnalysisMessagesBig(transcriptionText),
                    response_format: { type: 'json_object' },
                });

                const raw = chatResponse.choices[0]?.message?.content ?? '{}';

                const analysisKey = `audio-analysis/${audioId}.pdf`;
                const analysisText = await generateCallAnalysisPdfBig(JSON.parse(raw));

                await s3.send(new PutObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: analysisKey,
                    Body: analysisText,
                    ContentType: 'application/pdf',
                }));

                await db.update(audioFiles)
                    .set({ status: 'analyzed', analysisS3Key: analysisKey, updatedAt: new Date() })
                    .where(eq(audioFiles.id, audioId));
            } catch (err) {
                await db.update(audioFiles)
                    .set({ status: 'failed', updatedAt: new Date() })
                    .where(eq(audioFiles.id, audioId));
                throw err;
            }
        },
        {
            connection,
            lockDuration: 5 * 60 * 1000, // 5 minutes
        }
    );

    worker.on('completed', (job) => {
        console.log(`Analysis job ${job.id} completed for audio ${job.data.audioId}`);
    });

    worker.on('failed', (job, err) => {
        console.error(`Analysis job ${job?.id} failed for audio ${job?.data.audioId}:`, err);
    });

    return worker;
}
