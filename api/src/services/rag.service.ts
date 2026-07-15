import "dotenv/config";
import { Document, SentenceSplitter } from 'llamaindex';
import { OpenAIEmbedding } from '@llamaindex/openai';
import qdrant from '../../config/qdrant.config.js';
import chunkPointId from "../utils/hash.utils.js";
import type { RagChunk } from "../utils/rag-chunk.types.js";

const COLLECTION_NAME = 'documents';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const VECTOR_SIZE = 1536; // text-embedding-3-small dimension

async function ensureCollection(): Promise<void> {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

    if (!exists) {
        await qdrant.createCollection(COLLECTION_NAME, {
            vectors: {
                size: VECTOR_SIZE,
                distance: 'Cosine',
            },
        });
    }
}

export interface RetrievedChunk {
    text: string;
    documentId: string;
    chunkIndex: number;
    pageNumber?: number;
    imageS3Key?: string;
}

export async function queryDocuments(query: string, topK: number): Promise<RetrievedChunk[]> {
    const embedder = new OpenAIEmbedding({
        model: EMBEDDING_MODEL,
        apiKey: process.env.OPENAI_API_KEY,
    });

    const queryVector = await embedder.getTextEmbedding(query);

    const results = await qdrant.search(COLLECTION_NAME, {
        vector: queryVector,
        limit: topK,
    });

    return results
        .filter((r) => r.payload)
        .map((r) => ({
            text: r.payload!['text'] as string,
            documentId: r.payload!['documentId'] as string,
            chunkIndex: r.payload!['chunkIndex'] as number,
            pageNumber: r.payload!['pageNumber'] as number | undefined,
            imageS3Key: r.payload!['imageS3Key'] as string | undefined,
        }));
}

export async function indexDocument(documentId: string, text: string): Promise<void> {
    await ensureCollection();

    const splitter = new SentenceSplitter({ chunkSize: 512, chunkOverlap: 50 });
    const doc = new Document({ text, id_: documentId });
    const nodes = splitter.getNodesFromDocuments([doc]);

    const embedder = new OpenAIEmbedding({
        model: EMBEDDING_MODEL,
        apiKey: process.env.OPENAI_API_KEY,
    });

    const points = [];
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const nodeText = node.getContent();
        const embedding = await embedder.getTextEmbedding(nodeText);

        points.push({
            id: chunkPointId(documentId, i),
            vector: embedding,
            payload: {
                documentId,
                chunkIndex: i,
                text: nodeText,
            },
        });
    }

    if (points.length > 0) {
        await qdrant.upsert(COLLECTION_NAME, {
            wait: true,
            points,
        });
    }
}

export async function indexDocumentChunks(documentId: string, chunks: RagChunk[]): Promise<void> {
    await ensureCollection();

    // Delete any existing points for this document before re-indexing
    await qdrant.delete(COLLECTION_NAME, {
        wait: true,
        filter: {
            must: [{ key: 'documentId', match: { value: documentId } }],
        },
    });

    if (chunks.length === 0) return;

    const embedder = new OpenAIEmbedding({
        model: EMBEDDING_MODEL,
        apiKey: process.env.OPENAI_API_KEY,
    });

    const points = [];
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await embedder.getTextEmbedding(chunk.text);

        points.push({
            id: chunkPointId(documentId, i),
            vector: embedding,
            payload: {
                documentId,
                chunkIndex: i,
                text: chunk.text,
                pageNumber: chunk.metadata.pageNumber,
                imageS3Key: chunk.metadata.imageS3Key,
                source: chunk.metadata.source,
                mimeType: chunk.metadata.mimeType,
            },
        });
    }

    await qdrant.upsert(COLLECTION_NAME, {
        wait: true,
        points,
    });
}
