import type { FastifyInstance } from 'fastify';
import { uploadFiles, downloadFile, removeFile, getFiles } from '../controllers/file.controller.js';

export async function fileRoutes(fastify: FastifyInstance): Promise<void> {
    // Upload single or multiple files
    fastify.post('/upload', uploadFiles);

    // Download file
    fastify.get('/download/:filename', downloadFile);

    // Delete file
    fastify.delete('/:filename', removeFile);

    // List all files
    fastify.get('/list', getFiles);
}
