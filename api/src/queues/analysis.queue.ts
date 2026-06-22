import { Queue } from 'bullmq';

export interface AnalysisJobData {
    audioId: string;
    textS3Key: string;
}

const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

export const analysisQueue = new Queue<AnalysisJobData, void, string>('analysis', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
    },
});
