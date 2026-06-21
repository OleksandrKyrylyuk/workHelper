import type { FastifyInstance } from 'fastify';
import { uploadAudio } from '../controllers/audio.controller.js';
import { requireAuth } from '../plugins/auth.plugin.js';

export async function audioRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.post('/upload', { preHandler: [requireAuth] }, uploadAudio);
    
    // Placeholder for future list endpoint
    // fastify.get('/list', { preHandler: [requireAuth] }, listAudio);
}
