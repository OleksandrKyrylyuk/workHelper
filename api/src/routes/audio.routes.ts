import type { FastifyInstance, RouteHandler } from 'fastify';
import { uploadAudio, listAudios, deleteAudio, downloadAudioText, downloadAnalysis } from '../controllers/audio.controller.js';
import { requireAuth } from '../plugins/auth.plugin.js';

export async function audioRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.post('/upload', { preHandler: [requireAuth] }, uploadAudio);
    fastify.get('/list', { preHandler: [requireAuth] }, listAudios);
    fastify.delete<{ Params: { id: string } }>('/:id', { preHandler: [requireAuth] }, deleteAudio as RouteHandler<{ Params: { id: string } }>);
    fastify.get<{ Params: { id: string } }>('/:id/download-text', { preHandler: [requireAuth] }, downloadAudioText as RouteHandler<{ Params: { id: string } }>);
    fastify.get<{ Params: { id: string } }>('/:id/download-analysis', { preHandler: [requireAuth] }, downloadAnalysis as RouteHandler<{ Params: { id: string } }>);
}
