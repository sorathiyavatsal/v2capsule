import { db } from '../db';
import { volumes, objectLocations } from '../db/schema';
import { sql, asc } from 'drizzle-orm';

/**
 * Select the best volume for uploading a file
 * Strategy: Choose the volume with the most available space
 */
export async function selectVolumeForUpload(fileSize: number) {
    // Get all volumes with sufficient space
    const availableVolumes = await db
        .select()
        .from(volumes)
        .where(sql`${volumes.capacity} - ${volumes.used} >= ${fileSize}`)
        .orderBy(asc(volumes.used)); // Least-used first

    if (availableVolumes.length === 0) {
        throw new Error('No volume with sufficient space available');
    }

    return availableVolumes[0];
}

/**
 * Update volume usage after file upload
 */
export async function incrementVolumeUsage(volumeId: number, size: number) {
    await db
        .update(volumes)
        .set({ used: sql`${volumes.used} + ${size}` })
        .where(sql`${volumes.id} = ${volumeId}`);
}

/**
 * Update volume usage after file deletion
 */
export async function decrementVolumeUsage(volumeId: number, size: number) {
    await db
        .update(volumes)
        .set({ used: sql`${volumes.used} - ${size}` })
        .where(sql`${volumes.id} = ${volumeId}`);
}
