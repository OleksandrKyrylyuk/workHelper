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
import { analysisQueue } from './analysis.queue.js';
import {formatTranscriptWithTimestamps, parseCsvLine} from '../utils/time.utils.js';
import type { TranscriptSegment } from '../utils/time.utils.js';
import {isAbsolute} from "pathe";

const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };
const execFileAsync = promisify(execFile);

type AudioChunk = {
    buffer: Buffer;
    startSeconds: number;
    endSeconds: number;
};

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
async function splitWithFfmpeg(
    buffer: Buffer,
    ext: string,
    segmentTimeSeconds = 600,
): Promise<AudioChunk[]> {
    const tmpDir = join(tmpdir(), `audio-${randomUUID()}`);
    await mkdir(tmpDir, { recursive: true });

    const safeExt = ext.replace('.', '');
    const inputPath = join(tmpDir, `input.${safeExt}`);
    const outputPattern = join(tmpDir, `chunk%03d.${safeExt}`);
    const segmentListPath = join(tmpDir, 'segments.csv');

    try {
        await writeFile(inputPath, buffer);

        await execFileAsync(ffmpegPath as unknown as string, [
            '-hide_banner',
            '-y',

            '-i', inputPath,

            '-f', 'segment',
            '-segment_time', String(segmentTimeSeconds),

            // Creates CSV with:
            // filename,start_time,end_time
            '-segment_list', segmentListPath,
            '-segment_list_type', 'csv',

            // Keep original codec, faster than re-encoding
            '-c', 'copy',

            // Each chunk starts from timestamp 0 internally
            '-reset_timestamps', '1',

            outputPattern,
        ]);

        const csv = await readFile(segmentListPath, 'utf-8');

        const rows = csv
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean)
            .map(parseCsvLine);

        if (rows.length === 0) {
            return [];
        }

        const firstStart = Number(rows[0][1] ?? 0);

        const chunks: AudioChunk[] = [];

        for (const row of rows) {
            const [filename, startRaw, endRaw] = row;

            const start = Number(startRaw);
            const end = Number(endRaw);

            const chunkPath = isAbsolute(filename)
                ? filename
                : join(tmpDir, filename);

            const chunkBuffer = await readFile(chunkPath);

            chunks.push({
                buffer: chunkBuffer,
                startSeconds: Math.max(0, start - firstStart),
                endSeconds: Math.max(0, end - firstStart),
            });
        }

        return chunks;
    } finally {
        await rm(tmpDir, { recursive: true, force: true });
    }
}

async function transcribeBuffer(
    openai: OpenAI,
    buffer: Buffer,
    contentType: string,
    ext: string,
    offsetSeconds = 0
): Promise<TranscriptSegment[]> {
    const file = await toFile(buffer, `audio.${ext}`, { type: contentType });
    const response = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
    });

    const segments = response.segments ?? [];

    return segments.map(segment => ({
        start: segment.start + offsetSeconds,
        end: segment.end + offsetSeconds,
        text: segment.text,
    }))
}

// Each GPT formatting call covers at most 15 minutes of audio so the output
// stays well within gpt-4.1-mini's 16 384-token output limit.
const FORMAT_WINDOW_SECONDS = 15 * 60;

const FORMATTING_PROMPT = `Відформатуй цей транскрипт як читабельну розмову українською мовою.

Правила:
- Використовуй позначення: Спікер 1, Спікер 2, Спікер 3 тощо.
- Додавай порожній рядок між репліками різних спікерів.
- Весь текст має бути українською мовою.
- Якщо в транскрипті є російські або англійські слова, переклади їх українською, зберігаючи зміст.
- Не вигадуй нову інформацію.
- Не додавай пояснень, коментарів або висновків.
- Виправляй лише очевидні помилки пунктуації, граматики та розпізнавання мовлення.
- Зберігай початковий зміст розмови.
- Якщо спікера неможливо визначити, використовуй "Невідомий спікер".
- Якщо є професійні терміни, пов'язані з каменем, стільницями, акриловим каменем, кварцитом, кварцом, компакт-плитами, слябами, фасадами, мийками, монтажем або продажем — зберігай їх коректно українською.
- Не скорочуй важливі деталі щодо цін, розмірів, матеріалів, кольорів, брендів, адрес, дат або домовленостей.

Контекст:
Розмова зазвичай стосується продажу та консультацій щодо каменю: акриловий камінь, кварцит, кварц, натуральний камінь, компакт-плити, сляби, стільниці, кухні, ванні кімнати, монтаж і замовлення.

Транскрипт:
`;

async function formatTranscription(
    openai: OpenAI,
    audioID: string,
    segments: TranscriptSegment[],
): Promise<string> {
    // Group segments into 15-minute windows and call GPT for each sequentially.
    // This prevents output-token truncation on long recordings.
    const windows: TranscriptSegment[][] = [];
    let current: TranscriptSegment[] = [];
    let windowEnd = FORMAT_WINDOW_SECONDS;

    for (const segment of segments) {
        if (segment.start >= windowEnd && current.length > 0) {
            windows.push(current);
            current = [];
            windowEnd = (Math.floor(segment.start / FORMAT_WINDOW_SECONDS) + 1) * FORMAT_WINDOW_SECONDS;
        }
        current.push(segment);
    }
    if (current.length > 0) windows.push(current);

    const formattedParts: string[] = [];
    for (const win of windows) {
        const rawText = formatTranscriptWithTimestamps(win);
        const response = await openai.responses.create({
            model: 'gpt-4.1-mini',
            max_output_tokens: 16384,
            input: FORMATTING_PROMPT + rawText,
        });
        formattedParts.push(response.output_text);
    }

    const formattedConversation = formattedParts.join('\n\n');
    return `Transcript\nAudio file: ${audioID}\nDate: ${new Date().toISOString()}\n\n${formattedConversation}`;
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

                let segments: TranscriptSegment[];

                if (buffer.length <= MAX_BYTES) {
                    segments  = await transcribeBuffer(openai, buffer, contentType, ext, 0);
                } else {
                    const chunks = await splitWithFfmpeg(buffer, ext);
                    const segmentParts = await Promise.all(
                        chunks.map((chunk) =>
                            transcribeBuffer(
                                openai,
                                chunk.buffer,
                                contentType,
                                ext,
                                chunk.startSeconds
                            )
                        )
                    );
                    segments = segmentParts.flat().sort((a, b) => a.start - b.start);
                }

                const formattedText = await formatTranscription(openai, audioId, segments);

                const textKey = `audio-texts/${audioId}.txt`;
                await s3.send(new PutObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: textKey,
                    Body: Buffer.from(formattedText, 'utf-8'),
                    ContentType: 'application/pdf; charset=utf-8',
                }));

                await db.update(audioFiles)
                    .set({ status: 'transcribed', textS3Key: textKey, updatedAt: new Date() })
                    .where(eq(audioFiles.id, audioId));

                // Enqueue analysis job
                await analysisQueue.add('analyze', { audioId, textS3Key: textKey });

                await db.update(audioFiles)
                    .set({ status: 'Analyzed', textS3Key: textKey, updatedAt: new Date() })
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
            lockDuration: 90 * 60 * 1000, // 90 minutes — covers download + ffmpeg + Whisper + GPT formatting for long audio
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
