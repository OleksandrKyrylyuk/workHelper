import type { FastifyInstance } from 'fastify';
import { uploadFiles } from '../controllers/file.controller.js';
import { requireAuth } from '../plugins/auth.plugin.js';

export async function fileRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.post('/upload', { preHandler: [requireAuth] }, uploadFiles);
}
