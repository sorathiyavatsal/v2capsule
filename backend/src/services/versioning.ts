import { db } from '../db';
import { objectVersions, objectLocations } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs-extra';
import { decrementVolumeUsage } from './volumeManager';

export interface Version {
    versionId: string;
    key: string;
    size: number;
    lastModified: Date;
    etag: string;
    isLatest: boolean;
    isDeleteMarker: boolean;
}

// Create a new version when uploading an object
export async function createVersion(
    bucketId: number,
    key: string,
    locationId: number,
    isLatest: boolean = true,
    isDeleteMarker: boolean = false,
    size?: number,
    etag?: string
): Promise<string> {
    const versionId = uuidv4();

    // Use transaction to ensure atomicity
    await db.transaction(async (tx) => {
        // Mark all existing versions as not latest
        await tx.update(objectVersions)
            .set({ isLatest: false })
            .where(and(
                eq(objectVersions.bucketId, bucketId),
                eq(objectVersions.key, key)
            ));

        // Create new version
        await tx.insert(objectVersions).values({
            bucketId,
            key,
            versionId,
            locationId,
            isLatest,
            isDeleteMarker,
            size,
            etag
        });
    });

    return versionId;
}

// List all versions of an object
export async function listVersions(bucketId: number, key?: string): Promise<Version[]> {
    const baseQuery = db.select({
        versionId: objectVersions.versionId,
        key: objectVersions.key,
        size: objectLocations.size,
        lastModified: objectVersions.createdAt,
        etag: objectLocations.etag,
        isLatest: objectVersions.isLatest,
        isDeleteMarker: objectVersions.isDeleteMarker,
    })
        .from(objectVersions)
        .leftJoin(objectLocations, eq(objectVersions.locationId, objectLocations.id));

    const versions = key
        ? await baseQuery.where(and(
            eq(objectVersions.bucketId, bucketId),
            eq(objectVersions.key, key)
        )).orderBy(desc(objectVersions.createdAt))
        : await baseQuery.where(eq(objectVersions.bucketId, bucketId))
            .orderBy(desc(objectVersions.createdAt));

    return versions.map(v => ({
        versionId: v.versionId,
        key: v.key,
        size: v.size || 0,
        lastModified: v.lastModified || new Date(),
        etag: v.etag || '',
        isLatest: v.isLatest,
        isDeleteMarker: v.isDeleteMarker,
    }));
}

// Get a specific version
export async function getVersion(bucketId: number, key: string, versionId: string) {
    const [version] = await db.select({
        versionId: objectVersions.versionId,
        locationId: objectVersions.locationId,
        isDeleteMarker: objectVersions.isDeleteMarker,
        location: objectLocations,
    })
        .from(objectVersions)
        .leftJoin(objectLocations, eq(objectVersions.locationId, objectLocations.id))
        .where(and(
            eq(objectVersions.bucketId, bucketId),
            eq(objectVersions.key, key),
            eq(objectVersions.versionId, versionId)
        ));

    return version;
}

// Delete a specific version
export async function deleteVersion(
    bucketId: number,
    key: string,
    versionId: string,
    storagePath: string,
    volumeId: number
): Promise<void> {
    const version = await getVersion(bucketId, key, versionId);

    if (!version) {
        throw new Error('Version not found');
    }

    // If it's a delete marker, just remove it from the database
    if (version.isDeleteMarker) {
        await db.delete(objectVersions)
            .where(and(
                eq(objectVersions.bucketId, bucketId),
                eq(objectVersions.key, key),
                eq(objectVersions.versionId, versionId)
            ));
        return;
    }

    // Use transaction for atomicity
    await db.transaction(async (tx) => {
        // Delete the physical file and update volume usage
        if (version.location) {
            const filePath = path.join(storagePath, version.location.filePath);
            const fileSize = version.location.size;

            await fs.remove(filePath);

            // Decrement volume usage
            await decrementVolumeUsage(volumeId, fileSize);

            // Delete the location record
            await tx.delete(objectLocations)
                .where(eq(objectLocations.id, version.locationId!));
        }

        // Delete the version record
        await tx.delete(objectVersions)
            .where(and(
                eq(objectVersions.bucketId, bucketId),
                eq(objectVersions.key, key),
                eq(objectVersions.versionId, versionId)
            ));

        // If this was the latest version, mark the next most recent as latest
        const remainingVersions = await listVersions(bucketId, key);
        if (remainingVersions.length > 0 && !remainingVersions[0].isLatest) {
            await tx.update(objectVersions)
                .set({ isLatest: true })
                .where(and(
                    eq(objectVersions.bucketId, bucketId),
                    eq(objectVersions.key, key),
                    eq(objectVersions.versionId, remainingVersions[0].versionId)
                ));
        }
    });
}

// Create a delete marker (soft delete when versioning is enabled)
export async function createDeleteMarker(bucketId: number, key: string): Promise<string> {
    const versionId = uuidv4();

    // Use transaction to ensure atomicity
    await db.transaction(async (tx) => {
        // Mark all existing versions as not latest
        await tx.update(objectVersions)
            .set({ isLatest: false })
            .where(and(
                eq(objectVersions.bucketId, bucketId),
                eq(objectVersions.key, key)
            ));

        // Create delete marker
        await tx.insert(objectVersions).values({
            bucketId,
            key,
            versionId,
            locationId: null,
            isLatest: true,
            isDeleteMarker: true,
        });
    });

    return versionId;
}

// Restore a previous version (make it the latest)
export async function restoreVersion(bucketId: number, key: string, versionId: string): Promise<void> {
    const version = await getVersion(bucketId, key, versionId);

    if (!version) {
        throw new Error('Version not found');
    }

    if (version.isDeleteMarker) {
        throw new Error('Cannot restore a delete marker');
    }

    // Use transaction to ensure atomicity
    await db.transaction(async (tx) => {
        // Mark all versions as not latest
        await tx.update(objectVersions)
            .set({ isLatest: false })
            .where(and(
                eq(objectVersions.bucketId, bucketId),
                eq(objectVersions.key, key)
            ));

        // Mark the specified version as latest
        await tx.update(objectVersions)
            .set({ isLatest: true })
            .where(and(
                eq(objectVersions.bucketId, bucketId),
                eq(objectVersions.key, key),
                eq(objectVersions.versionId, versionId)
            ));
    });
}
