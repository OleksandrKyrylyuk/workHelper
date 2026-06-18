import "dotenv/config";
import { Document, SentenceSplitter } from 'llamaindex';
import { OpenAIEmbedding } from '@llamaindex/openai';
import qdrant from '../../config/qdrant.config.js';
import chunkPointId from "../utils/hash.utils.js";

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
