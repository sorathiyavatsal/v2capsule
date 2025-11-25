import { Context, Hono } from 'hono';
import { db } from '../../db';
import { buckets, volumes, objectLocations, bucketCors, bucketPolicies, eventNotifications, multipartUploads, uploadParts, objectVersions } from '../../db/schema';
import { eq, sql, and } from 'drizzle-orm';
import fs from 'fs-extra';
import path from 'path';
import { authMiddleware } from '../../middlewares/auth';
import crypto from 'crypto';

function generateAccessKey() {
    return 'AKIA' + crypto.randomBytes(8).toString('hex').toUpperCase();
}

function generateSecretKey() {
    return crypto.randomBytes(20).toString('base64');
}

import { notificationRoutes } from './notifications';

const bucketRoutes = new Hono();

bucketRoutes.route('/', notificationRoutes);

bucketRoutes.use('*', authMiddleware);

// List Buckets
bucketRoutes.get('/', async (c) => {
    const allBuckets = await db.select().from(buckets);
    return c.json(allBuckets);
});

// Create Bucket
bucketRoutes.post('/', async (c: Context) => {
    const { name, volumeId } = await c.req.json();

    if (!name) {
        return c.json({ error: 'Bucket name is required' }, 400);
    }

    // Check if bucket exists
    const existing = await db.select().from(buckets).where(eq(buckets.name, name));
    if (existing.length > 0) {
        return c.json({ error: 'Bucket already exists' }, 409);
    }

    // Determine which volume to use
    let targetVolumeId = volumeId;

    if (!targetVolumeId) {
        // If no volume specified, use default volume
        const [defaultVol] = await db.select().from(volumes).where(eq(volumes.isDefault, true));
        if (!defaultVol) {
            return c.json({ error: 'No default storage volume found' }, 500);
        }
        targetVolumeId = defaultVol.id;
    } else {
        // Verify the specified volume exists
        const [vol] = await db.select().from(volumes).where(eq(volumes.id, targetVolumeId));
        if (!vol) {
            return c.json({ error: 'Specified volume not found' }, 404);
        }
    }

    // Get volume details
    const [volume] = await db.select().from(volumes).where(eq(volumes.id, targetVolumeId));

    // Create directory
    const bucketPath = path.join(volume.path, name);
    try {
        await fs.ensureDir(bucketPath);
    } catch (err) {
        return c.json({ error: 'Failed to create bucket directory' }, 500);
    }

    // Insert into DB
    const user = c.get('user') as any;
    const [newBucket] = await db.insert(buckets).values({
        name,
        volumeId: targetVolumeId,
        ownerId: user.id,
        accessKey: generateAccessKey(),
        secretKey: generateSecretKey(),
    }).returning();

    return c.json(newBucket, 201);
});

// Update Bucket Volume
bucketRoutes.patch('/:name', async (c) => {
    const name = c.req.param('name');
    const body = await c.req.json();
    const { volumeId, encryptionEnabled, encryptionType, versioningEnabled } = body;

    if (volumeId === undefined && encryptionEnabled === undefined && versioningEnabled === undefined) {
        return c.json({ error: 'No update parameters provided' }, 400);
    }

    // Check if bucket exists
    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, name));
    if (!bucket) {
        return c.json({ error: 'Bucket not found' }, 404);
    }

    const updateData: any = {};

    // Handle Volume Update
    if (volumeId !== undefined) {
        // Verify new volume exists
        const [volume] = await db.select().from(volumes).where(eq(volumes.id, volumeId));
        if (!volume) {
            return c.json({ error: 'Volume not found' }, 404);
        }
        updateData.volumeId = volumeId;
    }

    // Handle Encryption Update
    if (encryptionEnabled !== undefined) {
        updateData.encryptionEnabled = encryptionEnabled;
        if (encryptionEnabled && encryptionType) {
            updateData.encryptionType = encryptionType;
        }
    }

    // Handle Versioning Update
    if (versioningEnabled !== undefined) {
        updateData.versioningEnabled = versioningEnabled;
    }

    // Update bucket
    const [updated] = await db.update(buckets)
        .set(updateData)
        .where(eq(buckets.name, name))
        .returning();

    return c.json({
        message: 'Bucket updated successfully',
        bucket: updated,
        note: volumeId ? 'New uploads will use the new volume. Existing objects remain on their current volumes.' : undefined
    });
});


// Get Bucket Keys
bucketRoutes.get('/:name/keys', async (c) => {
    const name = c.req.param('name');

    const [bucket] = await db.select({
        accessKey: buckets.accessKey,
        secretKey: buckets.secretKey
    }).from(buckets).where(eq(buckets.name, name));

    if (!bucket) {
        return c.json({ error: 'Bucket not found' }, 404);
    }

    return c.json(bucket);
});

// Regenerate Bucket Keys
bucketRoutes.post('/:name/keys/regenerate', async (c) => {
    const name = c.req.param('name');

    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, name));
    if (!bucket) {
        return c.json({ error: 'Bucket not found' }, 404);
    }

    const accessKey = generateAccessKey();
    const secretKey = generateSecretKey();

    await db.update(buckets)
        .set({ accessKey, secretKey })
        .where(eq(buckets.name, name));

    return c.json({
        message: 'Keys regenerated successfully',
        accessKey,
        secretKey
    });
});

// Get Object Distribution (stats about which volumes have objects)
bucketRoutes.get('/:name/distribution', async (c) => {
    const name = c.req.param('name');

    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, name));
    if (!bucket) {
        return c.json({ error: 'Bucket not found' }, 404);
    }

    // Get object distribution across volumes
    const distribution = await db
        .select({
            volumeId: objectLocations.volumeId,
            volumeName: volumes.name,
            objectCount: sql<number>`count(*)`,
            totalSize: sql<number>`sum(${objectLocations.size})`,
        })
        .from(objectLocations)
        .innerJoin(volumes, eq(objectLocations.volumeId, volumes.id))
        .where(eq(objectLocations.bucketId, bucket.id))
        .groupBy(objectLocations.volumeId, volumes.name);

    const totalObjects = distribution.reduce((sum, d) => sum + Number(d.objectCount), 0);
    const totalSize = distribution.reduce((sum, d) => sum + Number(d.totalSize || 0), 0);

    return c.json({
        bucketName: name,
        currentVolumeId: bucket.volumeId,
        distribution,
        summary: {
            totalObjects,
            totalSize,
            volumeCount: distribution.length,
        },
    });
});

// Delete Bucket
bucketRoutes.delete('/:name', async (c) => {
    const name = c.req.param('name');

    const [bucket] = await db.select().from(buckets).innerJoin(volumes, eq(buckets.volumeId, volumes.id)).where(eq(buckets.name, name));

    if (!bucket) {
        return c.json({ error: 'Bucket not found' }, 404);
    }

    const bucketPath = path.join(bucket.volumes.path, name);

    // Check if empty (filesystem check)
    // Note: This might need to be enhanced to check objectLocations count for accuracy
    try {
        if (await fs.pathExists(bucketPath)) {
            const files = await fs.readdir(bucketPath);
            if (files.length > 0) {
                return c.json({ error: 'Bucket is not empty' }, 409);
            }
        }
    } catch (err) {
        // Ignore error if directory doesn't exist
    }

    // Clean up related database records
    const bucketId = bucket.buckets.id;

    // 1. Delete Bucket CORS
    await db.delete(bucketCors).where(eq(bucketCors.bucketId, bucketId));

    // 2. Delete Bucket Policies
    await db.delete(bucketPolicies).where(eq(bucketPolicies.bucketId, bucketId));

    // 3. Delete Event Notifications
    await db.delete(eventNotifications).where(eq(eventNotifications.bucketId, bucketId));

    // 4. Clean up Multipart Uploads
    // First find uploads for this bucket
    const uploads = await db.select().from(multipartUploads).where(eq(multipartUploads.bucketId, bucketId));

    if (uploads.length > 0) {
        const uploadIds = uploads.map(u => u.uploadId);
        // Delete parts for these uploads
        // We need to iterate or use 'inArray' if available, but for now let's loop to be safe with basic operators
        for (const upload of uploads) {
            await db.delete(uploadParts).where(eq(uploadParts.uploadId, upload.uploadId));
        }
        // Delete the uploads
        await db.delete(multipartUploads).where(eq(multipartUploads.bucketId, bucketId));
    }

    // 5. Delete Object Locations (should be empty if file check passed, but good to be safe)
    await db.delete(objectLocations).where(eq(objectLocations.bucketId, bucketId));

    // 6. Delete Object Versions
    await db.delete(objectVersions).where(eq(objectVersions.bucketId, bucketId));

    // 7. Remove directory
    await fs.remove(bucketPath);

    // 8. Remove from DB
    await db.delete(buckets).where(eq(buckets.name, name));

    return c.json({ message: 'Bucket deleted' });
});

// Create Folder
bucketRoutes.post('/:name/folder', async (c) => {
    const name = c.req.param('name');
    const { path: folderPath } = await c.req.json();

    if (!folderPath) {
        return c.json({ error: 'Folder path is required' }, 400);
    }

    const [bucket] = await db.select().from(buckets).innerJoin(volumes, eq(buckets.volumeId, volumes.id)).where(eq(buckets.name, name));

    if (!bucket) {
        return c.json({ error: 'Bucket not found' }, 404);
    }

    const fullPath = path.join(bucket.volumes.path, name, folderPath);

    try {
        await fs.ensureDir(fullPath);
    } catch (err) {
        return c.json({ error: 'Failed to create folder' }, 500);
    }

    // Insert into objectLocations to make it visible
    const objectKey = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;

    const existing = await db.select().from(objectLocations).where(
        and(
            eq(objectLocations.bucketId, bucket.buckets.id),
            eq(objectLocations.objectKey, objectKey)
        )
    );

    if (existing.length === 0) {
        await db.insert(objectLocations).values({
            bucketId: bucket.buckets.id,
            objectKey,
            volumeId: bucket.buckets.volumeId,
            filePath: fullPath,
            size: 0,
        });
    }

    return c.json({ message: 'Folder created' }, 201);
});

// List Objects in Bucket (with path support)
bucketRoutes.get('/:name/objects', async (c) => {
    const name = c.req.param('name');
    const queryPath = c.req.query('path') || '';

    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, name));

    if (!bucket) {
        return c.json({ error: 'Bucket not found' }, 404);
    }

    // Query object locations for this bucket
    const locations = await db.select()
        .from(objectLocations)
        .innerJoin(volumes, eq(objectLocations.volumeId, volumes.id))
        .where(eq(objectLocations.bucketId, bucket.id));

    // Filter by path prefix if specified
    let filteredObjects = locations;
    if (queryPath) {
        const prefix = queryPath.endsWith('/') ? queryPath : `${queryPath}/`;
        filteredObjects = locations.filter(loc =>
            loc.object_locations.objectKey.startsWith(prefix)
        );
    }

    // Group by immediate children (files and folders)
    const pathDepth = queryPath ? queryPath.split('/').filter(Boolean).length : 0;
    const children = new Map<string, any>();

    for (const loc of filteredObjects) {
        const key = loc.object_locations.objectKey;
        const relativePath = queryPath ? key.substring(queryPath.length + 1) : key;

        if (!relativePath) continue; // Skip if it's the exact path

        const parts = relativePath.split('/').filter(Boolean);
        if (parts.length === 0) continue;

        const immediateChild = parts[0];
        const isDirectory = parts.length > 1 || (parts.length === 1 && key.endsWith('/'));

        if (!children.has(immediateChild)) {
            if (isDirectory) {
                children.set(immediateChild, {
                    name: immediateChild,
                    path: queryPath ? `${queryPath}/${immediateChild}` : immediateChild,
                    isDirectory: true,
                    size: 0,
                    lastModified: loc.object_locations.createdAt,
                });
            } else {
                children.set(immediateChild, {
                    name: immediateChild,
                    path: key,
                    isDirectory: false,
                    size: loc.object_locations.size,
                    lastModified: loc.object_locations.createdAt,
                });
            }
        }
    }

    const objects = Array.from(children.values());
    return c.json({ objects });
});

export default bucketRoutes;
