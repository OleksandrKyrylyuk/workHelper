import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execa } from 'execa';
import OpenAI from 'openai';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

import type { RagChunk } from './rag-chunk.types.js';
import s3 from '../../config/s3.config.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

type ExtractPdfArgs = {
    buffer: Buffer;
    documentId: string;
    originalS3Key: string;
    mimeType: string;
};

export async function extractPdfChunksWithImages({
                                                     buffer,
                                                     documentId,
                                                     originalS3Key,
                                                     mimeType,
                                                 }: ExtractPdfArgs): Promise<RagChunk[]> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-rag-'));
    const pdfPath = path.join(tempDir, `${documentId}.pdf`);

    try {
        await fs.writeFile(pdfPath, buffer);

        const pageTexts = await extractPdfTextPerPage(buffer);

        const pageImagePaths = await renderPdfPagesToImages({
            pdfPath,
            outputDir: tempDir,
        });

        const chunks: RagChunk[] = [];

        for (let i = 0; i < pageTexts.length; i++) {
            const pageNumber = i + 1;
            const pageText = pageTexts[i] ?? '';

            const imagePath = pageImagePaths[i];

            let imageS3Key: string | undefined;
            let visualDescription = '';

            if (imagePath) {
                const imageBuffer = await fs.readFile(imagePath);

                const contextSlug = deriveSlugFromPageText(pageText, pageNumber);

                imageS3Key = buildPageImageS3Key({
                    documentId,
                    pageNumber,
                    contextSlug,
                });

                await s3.send(
                    new PutObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: imageS3Key,
                        Body: imageBuffer,
                        ContentType: 'image/png',
                    }),
                );

                visualDescription = await describePdfPageImage({
                    imageBuffer,
                    pageNumber,
                });
            }

            const combinedText = buildPdfPageText({
                pageNumber,
                pageText,
                visualDescription,
                originalS3Key,
            });

            chunks.push({
                text: combinedText,
                metadata: {
                    documentId,
                    mimeType,
                    source: originalS3Key,
                    pageNumber,
                    imageS3Key,
                    hasImage: Boolean(imageS3Key),
                    kind: 'pdf_page',
                },
            });
        }

        return chunks;
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}

async function extractPdfTextPerPage(buffer: Buffer): Promise<string[]> {
    const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        disableFontFace: true,
    });

    const pdf = await loadingTask.promise;

    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();

        const text = textContent.items
            .map((item: any) => {
                if ('str' in item) return item.str;
                return '';
            })
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

        pages.push(text);
    }

    return pages;
}

type RenderPdfPagesArgs = {
    pdfPath: string;
    outputDir: string;
};

async function renderPdfPagesToImages({
                                          pdfPath,
                                          outputDir,
                                      }: RenderPdfPagesArgs): Promise<string[]> {
    const outputPrefix = path.join(outputDir, 'page');

    await execa('pdftoppm', [
        '-png',
        '-r',
        '150',
        pdfPath,
        outputPrefix,
    ]);

    const files = await fs.readdir(outputDir);

    const pageImages = files
        .filter((file) => file.startsWith('page-') && file.endsWith('.png'))
        .sort((a, b) => {
            const pageA = Number(a.match(/page-(\d+)\.png/)?.[1] ?? 0);
            const pageB = Number(b.match(/page-(\d+)\.png/)?.[1] ?? 0);
            return pageA - pageB;
        })
        .map((file) => path.join(outputDir, file));

    return pageImages;
}

type DescribePdfPageImageArgs = {
    imageBuffer: Buffer;
    pageNumber: number;
};

async function describePdfPageImage({
                                        imageBuffer,
                                        pageNumber,
                                    }: DescribePdfPageImageArgs): Promise<string> {
    const base64 = imageBuffer.toString('base64');

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: `
You are describing a PDF page for a RAG search index.

Page number: ${pageNumber}

Describe the visual content of this page.

Include:
- headings and large visible text
- product names
- colors, materials, surfaces, furniture, architecture, objects
- charts, tables, labels, UI elements, buttons
- anything important that a user might search for later

Be concise but information-rich.
                        `.trim(),
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:image/png;base64,${base64}`,
                        },
                    },
                ],
            },
        ],
    });

    return response.choices[0]?.message?.content?.trim() ?? '';
}

type BuildPdfPageTextArgs = {
    pageNumber: number;
    pageText: string;
    visualDescription: string;
    originalS3Key: string;
};

function buildPdfPageText({
                              pageNumber,
                              pageText,
                              visualDescription,
                              originalS3Key,
                          }: BuildPdfPageTextArgs): string {
    return `
Source file: ${originalS3Key}
Page: ${pageNumber}

Extracted PDF text:
${pageText || '[No extracted text]'}

Visual description of page image:
${visualDescription || '[No visual description]'}
    `.trim();
}

function deriveSlugFromPageText(text: string, pageNumber: number): string {
    const firstLine = text
        .split(/[\n\r]+/)
        .map((l) => l.trim())
        .find((l) => l.length > 0);

    if (!firstLine) return `page-${pageNumber}`;

    const slug = firstLine
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 50)
        .replace(/-+$/, '');

    return slug || `page-${pageNumber}`;
}

function buildPageImageS3Key({
                                 documentId,
                                 pageNumber,
                                 contextSlug,
                             }: {
    documentId: string;
    pageNumber: number;
    contextSlug: string;
}) {
    return `derived/pdf-pages/${documentId}/page-${pageNumber}-${contextSlug}.png`;
}