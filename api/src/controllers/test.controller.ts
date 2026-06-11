import type { FastifyRequest, FastifyReply } from "fastify";

export async function getTest(req: FastifyRequest, res: FastifyReply) {
    try {
        res.status(200).send('Working...')
    } catch (error) {
        res.status(500).send(error)
    }
}
