import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fjwt from '@fastify/jwt'

export async function authPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.register(fjwt, {
    secret: process.env.AUTH_SECRET!,
    verify: { algorithms: ['HS256'] },
  })
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify()
  } catch {
    reply.status(401).send({ error: 'Unauthorized' })
  }
}
