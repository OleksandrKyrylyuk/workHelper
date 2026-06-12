import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import type { MultipartFile } from '@fastify/multipart';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const TEMP_DIR = path.join(process.cwd(), 'uploads', 'temp');

/**
 * Ensure the upload directory exists
 */
export async function ensureUploadDir(): Promise<void> {
    try {
        await fs.access(UPLOAD_DIR);
    } catch {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
    }
    
    // Also ensure temp directory exists
    try {
        await fs.access(TEMP_DIR);
    } catch {
        await fs.mkdir(TEMP_DIR, { recursive: true });
    }
}

/**
 * Save an uploaded file to the temporary directory
 */
export async function saveFileToTemp(file: MultipartFile): Promise<{ filename: string; filepath: string; mimetype: string }> {
    await ensureUploadDir();
    
    const filename = `${Date.now()}-${file.filename}`;
    const filepath = path.join(TEMP_DIR, filename);
    
    await pipeline(file.file, createWriteStream(filepath));
    
    return {
        filename,
        filepath,
        mimetype: file.mimetype
    };
}

/**
 * Move file from temp to permanent uploads directory
 */
export async function moveFromTempToPermanent(filename: string): Promise<void> {
    const tempPath = path.join(TEMP_DIR, filename);
    const permanentPath = path.join(UPLOAD_DIR, filename);
    
    await fs.rename(tempPath, permanentPath);
}

/**
 * Delete a file from the temporary directory
 */
export async function deleteTempFile(filename: string): Promise<void> {
    const filepath = path.join(TEMP_DIR, filename);
    try {
        await fs.unlink(filepath);
    } catch (error) {
        // Ignore errors if file doesn't exist
        console.error('Failed to delete temp file:', filename, error);
    }
}

/**
 * Save an uploaded file to the uploads directory (direct - legacy)
 */
export async function saveFile(file: MultipartFile): Promise<{ filename: string; filepath: string; mimetype: string }> {
    await ensureUploadDir();
    
    const filename = `${Date.now()}-${file.filename}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    
    await pipeline(file.file, createWriteStream(filepath));
    
    return {
        filename,
        filepath,
        mimetype: file.mimetype
    };
}

/**
 * Get file path by filename
 */
export function getFilePath(filename: string): string {
    return path.join(UPLOAD_DIR, filename);
}

/**
 * Check if file exists
 */
export async function fileExists(filename: string): Promise<boolean> {
    try {
        await fs.access(getFilePath(filename));
        return true;
    } catch {
        return false;
    }
}

/**
 * Delete a file from the uploads directory
 */
export async function deleteFile(filename: string): Promise<void> {
    const filepath = getFilePath(filename);
    await fs.unlink(filepath);
}

/**
 * List all files in the uploads directory
 */
export async function listFiles(): Promise<string[]> {
    try {
        await ensureUploadDir();
        return await fs.readdir(UPLOAD_DIR);
    } catch {
        return [];
    }
}

/**
 * Get file stats
 */
export async function getFileStats(filename: string): Promise<{ size: number; created: Date } | null> {
    try {
        const filepath = getFilePath(filename);
        const stats = await fs.stat(filepath);
        return {
            size: stats.size,
            created: stats.birthtime
        };
    } catch {
        return null;
    }
}
