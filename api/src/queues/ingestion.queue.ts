import { Queue } from 'bullmq';

export interface IngestionJobData {
    documentId: string;
    s3Key: string;
    mimeType: string;
}

const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

export const ingestionQueue = new Queue<IngestionJobData, void, string>('ingestion', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
    },
});
