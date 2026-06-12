import type { FastifyRequest, FastifyReply } from 'fastify';
import {
    saveFileToTemp,
    moveFromTempToPermanent,
    deleteTempFile,
    getFilePath,
    fileExists,
    deleteFile,
    listFiles,
    getFileStats
} from '../utils/file.utils.js';
import { createReadStream } from 'fs';

/**
 * Upload single or multiple files
 * Files are saved to temp directory first, then moved to permanent location on success
 */
export async function uploadFiles(req: FastifyRequest, res: FastifyReply): Promise<void> {
    const tempFiles: string[] = [];

    try {
        const parts = req.parts();
        const results: Array<{ filename: string; mimetype: string }> = [];

        // Step 1: Save all files to temporary directory
        for await (const part of parts) {
            if (part.type === 'file') {
                try {
                    const saved = await saveFileToTemp(part);
                    tempFiles.push(saved.filename);
                    results.push({
                        filename: saved.filename,
                        mimetype: saved.mimetype
                    });
                } catch (fileError) {
                    // If saving to temp fails, clean up all temp files and throw error
                    await cleanupTempFiles(tempFiles);
                    throw fileError;
                }
            }
        }

        if (results.length === 0) {
            return res.status(400).send({ error: 'No files uploaded' });
        }

        // Step 2: All files saved to temp successfully, now move to permanent location
        try {
            for (const filename of tempFiles) {
                await moveFromTempToPermanent(filename);
            }
        } catch (moveError) {
            // If moving fails, clean up temp files
            await cleanupTempFiles(tempFiles);
            throw new Error(`Failed to move files to permanent storage: ${moveError instanceof Error ? moveError.message : 'Unknown error'}`);
        }

        // Step 3: Success! Return response
        return res.status(200).send({
            success: true,
            message: results.length === 1 ? 'File uploaded successfully' : 'Files uploaded successfully',
            files: results
        });
    } catch (error) {
        console.error('Upload error:', error);

        // Clean up any remaining temp files on error
        await cleanupTempFiles(tempFiles);

        // Check if it's a file size error
        if (error instanceof Error) {
            if (error.message.includes('file too large') || error.message.includes('fileSize')) {
                return res.status(413).send({
                    error: 'File too large',
                    message: 'Maximum file size is 10MB'
                });
            }
        }

        return res.status(500).send({
            error: 'Failed to upload files',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * Helper function to clean up temporary files
 */
async function cleanupTempFiles(filenames: string[]): Promise<void> {
    for (const filename of filenames) {
        try {
            await deleteTempFile(filename);
        } catch (cleanupError) {
            console.error('Failed to cleanup temp file:', filename, cleanupError);
        }
    }
}

/**
 * Download a file
 */
export async function downloadFile(req: FastifyRequest<{ Params: { filename: string } }>, res: FastifyReply): Promise<void> {
    try {
        const { filename } = req.params;

        if (!filename) {
            return res.status(400).send({ error: 'Filename is required' });
        }

        const exists = await fileExists(filename);
        if (!exists) {
            return res.status(404).send({ error: 'File not found' });
        }

        const filepath = getFilePath(filename);
        const stream = createReadStream(filepath);

        res.type('application/octet-stream');
        res.header('Content-Disposition', `attachment; filename="${filename}"`);
        
        return res.send(stream);
    } catch (error) {
        console.error('Download error:', error);
        return res.status(500).send({
            error: 'Failed to download file',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * Delete a file
 */
export async function removeFile(req: FastifyRequest<{ Params: { filename: string } }>, res: FastifyReply): Promise<void> {
    try {
        const { filename } = req.params;

        if (!filename) {
            res.status(400).send({ error: 'Filename is required' });
            return;
        }

        const exists = await fileExists(filename);
        if (!exists) {
            res.status(404).send({ error: 'File not found' });
            return;
        }

        await deleteFile(filename);

        res.status(200).send({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).send({
            error: 'Failed to delete file',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * List all uploaded files
 */
export async function getFiles(req: FastifyRequest, res: FastifyReply): Promise<void> {
    try {
        const files = await listFiles();

        const filesWithStats = await Promise.all(
            files.map(async (filename) => {
                const stats = await getFileStats(filename);
                return {
                    filename,
                    size: stats?.size ?? 0,
                    created: stats?.created ?? new Date()
                };
            })
        );

        res.status(200).send({
            success: true,
            files: filesWithStats
        });
    } catch (error) {
        console.error('List files error:', error);
        res.status(500).send({
            error: 'Failed to list files',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
