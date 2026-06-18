import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        await parser.destroy();
        return result.text;
    }

    if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword'
    ) {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }

    if (mimeType === 'text/plain' || mimeType === 'text/markdown' || mimeType === 'text/x-markdown') {
        return buffer.toString('utf-8');
    }

    throw new Error(`Unsupported mime type for text extraction: ${mimeType}`);
}