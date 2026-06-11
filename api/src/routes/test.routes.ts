import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { getTest } from "../controllers/test.controller.js"

export async function testRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
    fastify.get('/', getTest)
}
