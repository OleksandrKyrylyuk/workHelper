import type { FastifyInstance } from 'fastify';
import { chat } from '../controllers/chat.controller.js';
import { requireAuth } from '../plugins/auth.plugin.js';

export async function chatRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.post('/', { preHandler: [requireAuth] }, chat);
}
