import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fjwt from '@fastify/jwt'
import fp from 'fastify-plugin'

async function authPluginCore(fastify: FastifyInstance): Promise<void> {
  fastify.register(fjwt, {
    secret: process.env.AUTH_SECRET!,
    verify: { algorithms: ['HS256'] },
  })
}

export const authPlugin = fp(authPluginCore)

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify()
  } catch (err) {
    console.log('JWT verification error:', err)
    reply.status(401).send({ error: 'Unauthorized' })
  }
}
