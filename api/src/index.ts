import fastify from 'fastify'
import "dotenv/config";
import multipart from '@fastify/multipart';
import { fileRoutes } from './routes/file.routes.js';
import { ensureUploadDir } from './utils/file.utils.js';

const server = fastify();

// Register multipart for file uploads
server.register(multipart, {
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
        files: 10 // Max 10 files per request
    }
});

// Ensure upload directory exists
await ensureUploadDir();

// Register routes
server.register(fileRoutes, { prefix: '/files' })

const run =  () => {
    server.listen({ port: Number(process.env.SERVER_PORT ?? 3001), host: '0.0.0.0' },  (err, address) => {
        if (err) {
            console.error(err)
            process.exit(1)
        }
        console.log(`Server listening at ${address}`)
    })
};

run();