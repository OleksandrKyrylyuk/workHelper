import type { FastifyInstance } from 'fastify';
import { chat } from '../controllers/chat.controller.js';

export async function chatRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.post('/', chat);
}
