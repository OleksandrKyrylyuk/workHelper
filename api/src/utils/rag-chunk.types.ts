export type RagChunk = {
    text: string;
    metadata: {
        documentId: string;
        mimeType: string;
        pageNumber?: number;
        imageS3Key?: string;
        source?: string;
        [key: string]: unknown;
    };
};
