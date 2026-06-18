import fastify from 'fastify'
import "dotenv/config";
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { fileRoutes } from './routes/file.routes.js';
import { chatRoutes } from './routes/chat.routes.js';
import { createIngestionWorker } from './queues/ingestion.worker.js';
import { authPlugin } from './plugins/auth.plugin.js';

const server = fastify();

// Enable CORS for web app
server.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'DELETE']
});

// Register multipart for file uploads
server.register(multipart, {
    limits: {
        fileSize: 50 * 1024 * 1024, // 10MB max file size
        files: 10 // Max 10 files per request
    }
});

// Register auth plugin before routes
server.register(authPlugin)

// Register routes
server.register(fileRoutes, { prefix: '/files' })
server.register(chatRoutes, { prefix: '/chat' })

const run =  () => {
    // Start the BullMQ ingestion worker
    createIngestionWorker();

    server.listen({ port: Number(process.env.SERVER_PORT ?? 3001), host: '0.0.0.0' },  (err, address) => {
        if (err) {
            console.error(err)
            process.exit(1)
        }
        console.log(`Server listening at ${address}`)
    })
};

run();