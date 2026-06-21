import { Queue } from 'bullmq';

export interface TranscriptionJobData {
    audioId: string;
    s3Key: string;
    contentType: string;
}

const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

export const transcriptionQueue = new Queue<TranscriptionJobData, void, string>('transcription', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
    },
});
