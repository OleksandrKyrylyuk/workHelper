import fastify from 'fastify'
import "dotenv/config";
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { fileRoutes } from './routes/file.routes.js';
import { chatRoutes } from './routes/chat.routes.js';
import { audioRoutes } from './routes/audio.routes.js';
import { createIngestionWorker } from './queues/ingestion.worker.js';
import { createTranscriptionWorker } from './queues/transcription.worker.js';
import { createAnalysisWorker } from './queues/analysis.worker.js';
import { authPlugin } from './plugins/auth.plugin.js';
import { runMigrations } from './db/migrate.js';

const server = fastify();

// Enable CORS for web app
const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : '*';

server.register(cors, {
    origin: corsOrigin,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
});

// Register multipart for file uploads
server.register(multipart, {
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max file size
        files: 10 // Max 10 files per request
    }
});

// Register auth plugin before routes
server.register(authPlugin)

// Register routes
server.register(fileRoutes, { prefix: '/files' })
server.register(chatRoutes, { prefix: '/chat' })
server.register(audioRoutes, { prefix: '/audio' })

const run = async () => {
    await runMigrations();

    // Start the BullMQ ingestion worker
    createIngestionWorker();

    // Start the BullMQ transcription worker
    createTranscriptionWorker();

    // Start the BullMQ analysis worker
    createAnalysisWorker();

    server.listen({ port: Number(process.env.SERVER_PORT ?? 3001), host: '0.0.0.0' },  (err, address) => {
        if (err) {
            console.error(err)
            process.exit(1)
        }
        console.log(`Server listening at ${address}`)
        console.log(`CORS allowed origins:`, corsOrigin)
    })
};

run();