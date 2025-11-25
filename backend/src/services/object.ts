import { db } from '../db';
import { buckets, objectLocations, volumes } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import fs from 'fs-extra';
import path from 'path';
import { selectVolumeForUpload, incrementVolumeUsage, decrementVolumeUsage } from './volumeManager';

export async function copyObject(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string,
    metadataDirective: 'COPY' | 'REPLACE' = 'COPY',
    newMetadata?: any,
    conditionalHeaders?: {
        ifMatch?: string;
        ifNoneMatch?: string;
        ifModifiedSince?: Date;
        ifUnmodifiedSince?: Date;
    }
) {
    // 1. Get source object
    const [sourceB] = await db.select().from(buckets).where(eq(buckets.name, sourceBucket));
    if (!sourceB) throw new Error('Source bucket not found');

    const [sourceObj] = await db.select()
        .from(objectLocations)
        .where(and(
            eq(objectLocations.bucketId, sourceB.id),
            eq(objectLocations.objectKey, sourceKey)
        ));

    if (!sourceObj) throw new Error('Source object not found');

    // 2. Validate conditional headers
    if (conditionalHeaders) {
        // If-Match: Copy only if ETag matches
        if (conditionalHeaders.ifMatch && sourceObj.etag !== conditionalHeaders.ifMatch) {
            throw new Error('PreconditionFailed: If-Match condition not met');
        }

        // If-None-Match: Copy only if ETag doesn't match
        if (conditionalHeaders.ifNoneMatch && sourceObj.etag === conditionalHeaders.ifNoneMatch) {
            throw new Error('PreconditionFailed: If-None-Match condition not met');
        }

        // If-Modified-Since: Copy only if modified after specified date
        if (conditionalHeaders.ifModifiedSince && sourceObj.createdAt) {
            if (sourceObj.createdAt <= conditionalHeaders.ifModifiedSince) {
                throw new Error('PreconditionFailed: If-Modified-Since condition not met');
            }
        }

        // If-Unmodified-Since: Copy only if not modified after specified date
        if (conditionalHeaders.ifUnmodifiedSince && sourceObj.createdAt) {
            if (sourceObj.createdAt > conditionalHeaders.ifUnmodifiedSince) {
                throw new Error('PreconditionFailed: If-Unmodified-Since condition not met');
            }
        }
    }

    // 3. Get destination bucket
    const [destB] = await db.select().from(buckets).where(eq(buckets.name, destBucket));
    if (!destB) throw new Error('Destination bucket not found');

    // 3. Determine metadata
    let finalMetadata = sourceObj.metadata;
    if (metadataDirective === 'REPLACE' && newMetadata) {
        finalMetadata = JSON.stringify(newMetadata);
    }

    // 4. Handle same object copy (metadata update)
    if (sourceBucket === destBucket && sourceKey === destKey) {
        if (metadataDirective === 'REPLACE') {
            await db.update(objectLocations)
                .set({ metadata: finalMetadata })
                .where(eq(objectLocations.id, sourceObj.id));
            return {
                lastModified: sourceObj.createdAt,
                etag: sourceObj.etag,
                bucketId: destB.id,
                size: Number(sourceObj.size),
                versionId: undefined
            };
        } else {
            // No-op
            return {
                lastModified: sourceObj.createdAt,
                etag: sourceObj.etag,
                bucketId: destB.id,
                size: Number(sourceObj.size),
                versionId: undefined
            };
        }
    }

    // 5. Select volume for new object
    let volume;
    if (destB.volumeId) {
        const [prefVol] = await db.select().from(volumes).where(eq(volumes.id, destB.volumeId));
        if (prefVol && (BigInt(prefVol.capacity) - BigInt(prefVol.used)) >= BigInt(sourceObj.size)) {
            volume = prefVol;
        }
    }

    if (!volume) {
        volume = await selectVolumeForUpload(Number(sourceObj.size));
    }

    // 6. Copy file
    const destPath = path.join(volume.path, destBucket, destKey);
    await fs.ensureDir(path.dirname(destPath));
    await fs.copy(sourceObj.filePath, destPath);

    // 7. Insert new record
    const [existingDest] = await db.select()
        .from(objectLocations)
        .where(and(
            eq(objectLocations.bucketId, destB.id),
            eq(objectLocations.objectKey, destKey)
        ));

    if (existingDest) {
        try {
            await fs.unlink(existingDest.filePath);
        } catch (e) {
            // Ignore if missing
        }

        await decrementVolumeUsage(existingDest.volumeId, Number(existingDest.size));

        await db.update(objectLocations)
            .set({
                volumeId: volume.id,
                filePath: destPath,
                size: sourceObj.size,
                etag: sourceObj.etag,
                metadata: finalMetadata,
                contentType: sourceObj.contentType,
                createdAt: new Date()
            })
            .where(eq(objectLocations.id, existingDest.id));

        await incrementVolumeUsage(volume.id, Number(sourceObj.size));
    } else {
        await db.insert(objectLocations).values({
            bucketId: destB.id,
            objectKey: destKey,
            volumeId: volume.id,
            filePath: destPath,
            size: sourceObj.size,
            etag: sourceObj.etag,
            metadata: finalMetadata,
            contentType: sourceObj.contentType,
            createdAt: new Date()
        });

        await incrementVolumeUsage(volume.id, Number(sourceObj.size));
    }

    return {
        lastModified: new Date(),
        etag: sourceObj.etag,
        bucketId: destB.id,
        size: Number(sourceObj.size),
        versionId: undefined // Copy object doesn't support versioning yet in this implementation
    };
}
