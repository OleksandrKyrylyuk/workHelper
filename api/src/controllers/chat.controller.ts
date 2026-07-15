import { FastifyRequest, FastifyReply } from 'fastify';
import OpenAI from 'openai';
import { queryDocuments } from '../services/rag.service.js';
import { getSignedS3Url } from '../utils/s3.utils.js';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatRequestBody {
    message: string;
    history?: ChatMessage[];
}

interface ChatSource {
    documentId: string;
    pageNumber?: number;
    imageUrl?: string;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function chat(req: FastifyRequest, res: FastifyReply): Promise<void> {
    const { message, history = [] } = req.body as ChatRequestBody;

    if (!message || typeof message !== 'string' || message.trim() === '') {
        res.code(400).send({ error: 'message is required' });
        return;
    }

    let retrievedChunks: Awaited<ReturnType<typeof queryDocuments>> = [];
    try {
        retrievedChunks = await queryDocuments(message, 5);
    } catch (err) {
        req.log.warn({ err }, 'queryDocuments failed — proceeding without context');
    }

    if (retrievedChunks.length === 0) {
        res.code(200).send({ error: "I can only answer questions based on the documents in my knowledge base. I don't have relevant information to answer your question." });
        return;
    }

    // Build signed URLs for chunks that have page images
    const sources: ChatSource[] = await Promise.all(
        retrievedChunks.map(async (chunk) => {
            const source: ChatSource = { documentId: chunk.documentId, pageNumber: chunk.pageNumber };
            if (chunk.imageS3Key) {
                try {
                    source.imageUrl = await getSignedS3Url(chunk.imageS3Key, 3600);
                } catch (err) {
                    req.log.warn({ err, key: chunk.imageS3Key }, 'Failed to sign S3 URL — skipping image');
                }
            }
            return source;
        }),
    );

    // Build context text for system prompt
    const contextText = retrievedChunks
        .map((c, i) => `[${i + 1}] ${c.text}`)
        .join('\n\n');

    const hasImages = sources.some((s) => s.imageUrl);
    const systemPrompt = `You are a helpful assistant. Answer questions ONLY using the context provided below. Do NOT use any outside knowledge. If the answer is not present in the context, say that you don't have information about it.${hasImages ? '\n\nIMPORTANT: The relevant page images are automatically shown in the chat UI below your text response. When asked to show or see images — describe what you see in them. NEVER say you cannot show or display images.' : ''}\n\nContext:\n${contextText}`;

    // Build user message content — text + page images for vision
    type ContentPart = OpenAI.Chat.ChatCompletionContentPartText | OpenAI.Chat.ChatCompletionContentPartImage;
    const userContent: ContentPart[] = [{ type: 'text', text: message }];

    for (const source of sources) {
        if (source.imageUrl) {
            userContent.push({
                type: 'image_url',
                image_url: { url: source.imageUrl, detail: 'auto' },
            });
        }
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content } as OpenAI.Chat.ChatCompletionMessageParam)),
        { role: 'user', content: userContent },
    ];

    // SSE headers
    const origin = req.headers.origin;
    const allowedOrigin = process.env.CORS_ORIGIN || '*';
    res.raw.setHeader('Access-Control-Allow-Origin', allowedOrigin === '*' ? '*' : (origin ?? allowedOrigin));
    res.raw.setHeader('Content-Type', 'text/event-stream');
    res.raw.setHeader('Cache-Control', 'no-cache');
    res.raw.setHeader('Connection', 'keep-alive');
    res.raw.setHeader('X-Accel-Buffering', 'no');

    try {
        const stream = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            stream: true,
        });

        for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
                res.raw.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
        }

        // Send sources as a final SSE event before [DONE]
        const sourcesWithImages = sources.filter((s) => s.pageNumber !== undefined || s.imageUrl);
        if (sourcesWithImages.length > 0) {
            res.raw.write(`data: ${JSON.stringify({ sources: sourcesWithImages })}\n\n`);
        }

        res.raw.write('data: [DONE]\n\n');
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'AI service error';
        req.log.error({ err }, 'OpenAI streaming failed');
        res.raw.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    } finally {
        res.raw.end();
    }
}
