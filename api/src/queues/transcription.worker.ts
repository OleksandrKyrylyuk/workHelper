import { Worker } from 'bullmq';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import OpenAI, { toFile } from 'openai';
import { execFile } from 'child_process';
import { promisify } from 'util';
import ffmpegPath from 'ffmpeg-static';
import { writeFile, readFile, mkdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import s3 from '../../config/s3.config.js';
import { db } from '../db/index.js';
import { audioFiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { TranscriptionJobData } from './transcription.queue.js';

const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };
const execFileAsync = promisify(execFile);

// 25 MB Whisper limit — split before this threshold
const MAX_BYTES = 24 * 1024 * 1024;

async function downloadFromS3(s3Key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
    });
    const response = await s3.send(command);
    if (!response.Body) throw new Error(`Empty body from S3 for key: ${s3Key}`);
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

/**
 * Uses ffmpeg to split audio into 10-minute segments so each chunk is a
 * valid, self-contained audio file that Whisper can decode.
 */
async function splitWithFfmpeg(buffer: Buffer, ext: string): Promise<Buffer[]> {
    const tmpDir = join(tmpdir(), `audio-${randomUUID()}`);
    await mkdir(tmpDir, { recursive: true });

    const inputPath = join(tmpDir, `input.${ext}`);
    const outputPattern = join(tmpDir, `chunk%03d.${ext}`);

    try {
        await writeFile(inputPath, buffer);

        await execFileAsync(ffmpegPath as unknown as string, [
            '-i', inputPath,
            '-f', 'segment',
            '-segment_time', '600', // 10-minute segments
            '-c', 'copy',
            '-reset_timestamps', '1',
            outputPattern,
        ]);

        const result: Buffer[] = [];
        for (let i = 0; ; i++) {
            const chunkPath = join(tmpDir, `chunk${String(i).padStart(3, '0')}.${ext}`);
            try {
                result.push(await readFile(chunkPath));
            } catch {
                break;
            }
        }
        return result;
    } finally {
        await rm(tmpDir, { recursive: true, force: true });
    }
}

async function transcribeBuffer(
    openai: OpenAI,
    buffer: Buffer,
    contentType: string,
    ext: string,
): Promise<string> {
    const file = await toFile(buffer, `audio.${ext}`, { type: contentType });
    const response = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
    });
    return response.text;
}

export function createTranscriptionWorker() {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const worker = new Worker<TranscriptionJobData>(
        'transcription',
        async (job) => {
            const { audioId, s3Key, contentType } = job.data;

            await db.update(audioFiles)
                .set({ status: 'transcribing', updatedAt: new Date() })
                .where(eq(audioFiles.id, audioId));

            try {
                const buffer = await downloadFromS3(s3Key);
                const ext = s3Key.split('.').pop() ?? 'mp3';

                let parts: string[];

                if (buffer.length <= MAX_BYTES) {
                    parts = [await transcribeBuffer(openai, buffer, contentType, ext)];
                } else {
                    const chunks = await splitWithFfmpeg(buffer, ext);
                    parts = await Promise.all(
                        chunks.map((chunk) => transcribeBuffer(openai, chunk, contentType, ext))
                    );
                }

                const fullText = parts.join(' ');

                const textKey = `audio-texts/${audioId}.txt`;
                await s3.send(new PutObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: textKey,
                    Body: Buffer.from(fullText, 'utf-8'),
                    ContentType: 'text/plain; charset=utf-8',
                }));

                await db.update(audioFiles)
                    .set({ status: 'transcribed', textS3Key: textKey, updatedAt: new Date() })
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
            lockDuration: 10 * 60 * 1000, // 10 minutes — allows time for large file download + transcription
        }
    );

    worker.on('completed', (job) => {
        console.log(`Transcription job ${job.id} completed for audio ${job.data.audioId}`);
    });

    worker.on('failed', (job, err) => {
        console.error(`Transcription job ${job?.id} failed for audio ${job?.data.audioId}:`, err);
    });

    return worker;
}
