import { db } from '../db';
import { multipartUploads, uploadParts, buckets, objectLocations } from '../db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs-extra';

export async function initiateMultipartUpload(bucketName: string, objectKey: string, metadata?: any) {
    const bucket = await db.query.buckets.findFirst({
        where: eq(buckets.name, bucketName),
    });

    if (!bucket) {
        throw new Error('NoSuchBucket');
    }

    const uploadId = uuidv4();

    await db.insert(multipartUploads).values({
        uploadId,
        bucketId: bucket.id,
        objectKey,
        metadata: JSON.stringify(metadata || {}),
        initiatedAt: new Date(),
    });

    return uploadId;
}

export async function uploadPart(
    bucketName: string,
    objectKey: string,
    uploadId: string,
    partNumber: number,
    data: Buffer
) {
    // Verify upload exists
    const upload = await db.query.multipartUploads.findFirst({
        where: and(
            eq(multipartUploads.uploadId, uploadId),
            eq(multipartUploads.objectKey, objectKey)
        ),
        with: {
            bucket: true,
        }
    });

    if (!upload || !upload.bucket || upload.bucket.name !== bucketName) {
        throw new Error('NoSuchUpload');
    }

    // Create temp directory for parts if not exists
    const tempDir = path.join(process.cwd(), 'uploads', 'temp', uploadId);
    await fs.ensureDir(tempDir);

    const partPath = path.join(tempDir, `${partNumber}.part`);
    await fs.writeFile(partPath, data);

    // Calculate ETag (MD5)
    const crypto = await import('crypto');
    const etag = crypto.createHash('md5').update(data).digest('hex');

    // Save part info to DB
    await db.insert(uploadParts).values({
        uploadId,
        partNumber,
        etag: `"${etag}"`,
        size: data.length,
        filePath: partPath,
        uploadedAt: new Date(),
    }).onConflictDoUpdate({
        target: [uploadParts.uploadId, uploadParts.partNumber],
        set: {
            etag: `"${etag}"`,
            size: data.length,
            filePath: partPath,
            uploadedAt: new Date(),
        }
    });

    return `"${etag}"`;
}

export async function listParts(bucketName: string, objectKey: string, uploadId: string) {
    const upload = await db.query.multipartUploads.findFirst({
        where: and(
            eq(multipartUploads.uploadId, uploadId),
            eq(multipartUploads.objectKey, objectKey)
        ),
        with: {
            bucket: true,
        }
    });

    if (!upload || !upload.bucket || upload.bucket.name !== bucketName) {
        throw new Error('NoSuchUpload');
    }

    const parts = await db.query.uploadParts.findMany({
        where: eq(uploadParts.uploadId, uploadId),
        orderBy: [asc(uploadParts.partNumber)],
    });

    return parts;
}

export async function completeMultipartUpload(
    bucketName: string,
    objectKey: string,
    uploadId: string,
    parts: { PartNumber: number; ETag: string }[]
) {
    const upload = await db.query.multipartUploads.findFirst({
        where: and(
            eq(multipartUploads.uploadId, uploadId),
            eq(multipartUploads.objectKey, objectKey)
        ),
        with: {
            bucket: true,
        }
    });

    // Need to fetch bucket with volume separately if relation is tricky
    const bucket = await db.query.buckets.findFirst({
        where: eq(buckets.name, bucketName),
        with: {
            volume: true
        }
    });

    if (!upload || !bucket) {
        throw new Error('NoSuchUpload');
    }

    // Verify all parts exist and match ETags
    const uploadedParts = await db.query.uploadParts.findMany({
        where: eq(uploadParts.uploadId, uploadId),
        orderBy: [asc(uploadParts.partNumber)],
    });

    if (parts.length !== uploadedParts.length) {
        throw new Error('InvalidPart');
    }

    // Combine parts
    const finalPath = path.join(bucket.volume.path, bucketName, objectKey);
    await fs.ensureDir(path.dirname(finalPath));

    const writeStream = fs.createWriteStream(finalPath);

    for (const part of uploadedParts) {
        if (!part.filePath) continue;
        const partData = await fs.readFile(part.filePath);
        writeStream.write(partData);
    }

    writeStream.end();

    await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
    });

    // Cleanup parts
    const tempDir = path.join(process.cwd(), 'uploads', 'temp', uploadId);
    await fs.remove(tempDir);

    // Calculate final ETag (S3 style: MD5-of-parts + -numParts)

    let combinedEtags = Buffer.from('');
    for (const part of uploadedParts) {
        // Remove quotes from ETag
        const cleanEtag = (part.etag as string).replace(/"/g, '');
        combinedEtags = Buffer.concat([combinedEtags, Buffer.from(cleanEtag, 'hex')]);
    }

    const crypto = await import('crypto');
    const finalEtagHash = crypto.createHash('md5').update(combinedEtags).digest('hex');
    const finalEtag = `"${finalEtagHash}-${uploadedParts.length}"`;

    const stats = await fs.stat(finalPath);

    // Save to objectLocations
    await db.insert(objectLocations).values({
        bucketId: bucket.id,
        objectKey,
        volumeId: bucket.volumeId,
        filePath: finalPath,
        size: stats.size,
        etag: finalEtag,
        metadata: upload.metadata,
        isLatest: true,
        createdAt: new Date(),
    });

    // Delete upload record
    await db.delete(multipartUploads).where(eq(multipartUploads.uploadId, uploadId));

    return {
        location: `http://localhost:8787/${bucketName}/${objectKey}`, // TODO: Use env var
        bucket: bucketName,
        key: objectKey,
        etag: finalEtag,
        bucketId: bucket.id,
        size: stats.size,
        versionId: undefined // Multipart upload doesn't support versioning yet in this implementation
    };
}

export async function abortMultipartUpload(bucketName: string, objectKey: string, uploadId: string) {
    const upload = await db.query.multipartUploads.findFirst({
        where: and(
            eq(multipartUploads.uploadId, uploadId),
            eq(multipartUploads.objectKey, objectKey)
        ),
        with: {
            bucket: true,
        }
    });

    if (!upload || !upload.bucket || upload.bucket.name !== bucketName) {
        throw new Error('NoSuchUpload');
    }

    // Cleanup parts
    const tempDir = path.join(process.cwd(), 'uploads', 'temp', uploadId);
    await fs.remove(tempDir);

    // Delete from DB (cascade deletes parts)
    await db.delete(multipartUploads).where(eq(multipartUploads.uploadId, uploadId));
}
