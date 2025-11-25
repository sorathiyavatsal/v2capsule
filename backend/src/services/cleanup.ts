import { db } from '../db';
import { multipartUploads, uploadParts } from '../db/schema';
import { lt, eq } from 'drizzle-orm';
import fs from 'fs-extra';
import path from 'path';

/**
 * Cleanup abandoned multipart uploads older than specified hours
 */
export async function cleanupAbandonedUploads(olderThanHours: number = 24) {
    const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    // Find abandoned uploads
    const abandonedUploads = await db.select()
        .from(multipartUploads)
        .where(lt(multipartUploads.initiatedAt, cutoffDate));

    console.log(`Found ${abandonedUploads.length} abandoned uploads to clean up`);

    for (const upload of abandonedUploads) {
        try {
            // Delete temporary files
            const tempDir = path.join(process.cwd(), 'uploads', 'temp', upload.uploadId);
            if (await fs.pathExists(tempDir)) {
                await fs.remove(tempDir);
                console.log(`Deleted temp directory: ${tempDir}`);
            }

            // Delete upload parts from database
            await db.delete(uploadParts).where(eq(uploadParts.uploadId, upload.uploadId));

            // Delete upload record
            await db.delete(multipartUploads).where(eq(multipartUploads.uploadId, upload.uploadId));

            console.log(`Cleaned up upload: ${upload.uploadId}`);
        } catch (error) {
            console.error(`Failed to cleanup upload ${upload.uploadId}:`, error);
        }
    }

    return abandonedUploads.length;
}

/**
 * Start periodic cleanup job
 */
export function startCleanupJob(intervalHours: number = 6, olderThanHours: number = 24) {
    console.log(`Starting multipart upload cleanup job (runs every ${intervalHours}h, cleans uploads older than ${olderThanHours}h)`);

    // Run immediately on start
    cleanupAbandonedUploads(olderThanHours).catch(console.error);

    // Schedule periodic cleanup
    setInterval(() => {
        cleanupAbandonedUploads(olderThanHours).catch(console.error);
    }, intervalHours * 60 * 60 * 1000);
}
