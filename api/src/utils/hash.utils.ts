import { createHash } from 'crypto';

export default function chunkPointId(documentId: string, index: number): string {
    const h = createHash('sha1').update(`${documentId}:${index}`).digest('hex');
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}