import { FastifyRequest, FastifyReply } from 'fastify';
import { OpenAI } from '@llamaindex/openai';
import { queryDocuments } from '../services/rag.service.js';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatRequestBody {
    message: string;
    history?: ChatMessage[];
}

export async function chat(req: FastifyRequest, res: FastifyReply): Promise<void> {
    const { message, history = [] } = req.body as ChatRequestBody;

    if (!message || typeof message !== 'string' || message.trim() === '') {
        res.code(400).send({ error: 'message is required' });
        return;
    }

    let contextChunks: string[] = [];
    try {
        const chunks = await queryDocuments(message, 5);
        contextChunks = chunks.map((c) => c.text);
    } catch (err) {
        req.log.warn({ err }, 'queryDocuments failed — proceeding without context');
    }

    const systemPrompt = contextChunks.length > 0
        ? `You are a helpful assistant. Use the following context from the user's documents to answer questions accurately. If the answer is not in the context, say so honestly.\n\nContext:\n${contextChunks.map((t, i) => `[${i + 1}] ${t}`).join('\n\n')}`
        : 'You are a helpful assistant. No relevant documents were found for this query — answer based on your general knowledge.';

    const llm = new OpenAI({
        model: 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY,
    });

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
    ];

    // CORS must be set manually here because res.raw bypasses Fastify's onSend hooks
    const origin = req.headers.origin;
    const allowedOrigin = process.env.CORS_ORIGIN || '*';
    res.raw.setHeader(
        'Access-Control-Allow-Origin',
        allowedOrigin === '*' ? '*' : (origin ?? allowedOrigin)
    );
    res.raw.setHeader('Content-Type', 'text/event-stream');
    res.raw.setHeader('Cache-Control', 'no-cache');
    res.raw.setHeader('Connection', 'keep-alive');
    res.raw.setHeader('X-Accel-Buffering', 'no');

    try {
        const stream = await llm.chat({
            messages,
            stream: true,
        });

        for await (const chunk of stream) {
            const text = chunk.delta;
            if (text) {
                res.raw.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
        }

        res.raw.write('data: [DONE]\n\n');
    } catch (err) {
        req.log.error({ err }, 'OpenAI streaming failed');
        res.raw.write(`data: ${JSON.stringify({ error: 'AI service error' })}\n\n`);
    } finally {
        res.raw.end();
    }
}
