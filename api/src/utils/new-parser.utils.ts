import mammoth from 'mammoth';
import { extractPdfChunksWithImages } from './pdf-extraction.utils.js';
import type { RagChunk } from './rag-chunk.types.js';

type ExtractChunksArgs = {
    buffer: Buffer;
    mimeType: string;
    documentId: string;
    originalS3Key: string;
};

export async function extractChunksForRag({
                                              buffer,
                                              mimeType,
                                              documentId,
                                              originalS3Key,
                                          }: ExtractChunksArgs): Promise<RagChunk[]> {
    if (mimeType === 'application/pdf') {
        return extractPdfChunksWithImages({
            buffer,
            documentId,
            originalS3Key,
            mimeType,
        });
    }

    if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
    ) {
        const result = await mammoth.extractRawText({ buffer });

        return [
            {
                text: result.value,
                metadata: {
                    documentId,
                    mimeType,
                    source: originalS3Key,
                },
            },
        ];
    }

    if (
        mimeType === 'text/plain' ||
        mimeType === 'text/markdown' ||
        mimeType === 'text/x-markdown'
    ) {
        return [
            {
                text: buffer.toString('utf-8'),
                metadata: {
                    documentId,
                    mimeType,
                    source: originalS3Key,
                },
            },
        ];
    }

    throw new Error(`Unsupported mime type for extraction: ${mimeType}`);
}