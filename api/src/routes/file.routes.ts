import type { FastifyInstance } from 'fastify';
import { uploadFiles } from '../controllers/file.controller.js';

export async function fileRoutes(fastify: FastifyInstance): Promise<void> {
    // Upload single or multiple files
    fastify.post('/upload', uploadFiles);

    // Delete file
    // fastify.delete('/:filename', removeFile);
}
