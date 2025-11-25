import { Hono } from 'hono';
import { db } from '../../db';
import { volumes, objectLocations, buckets } from '../../db/schema';
import { authMiddleware } from '../../middlewares/auth';
import { eq, sql } from 'drizzle-orm';
import fs from 'fs-extra';
import { detectDrives, getPathCapacity, validateVolumePath } from '../../services/volumeDetection';

type Variables = {
    user: {
        id: number;
        email: string;
        role: string;
    };
};

const volumeRoutes = new Hono<{ Variables: Variables }>();

volumeRoutes.use('*', authMiddleware);

// Detect available drives (Super Admin only)
volumeRoutes.get('/detect', async (c) => {
    const currentUser = c.get('user');
    if (currentUser.role !== 'superadmin') {
        return c.json({ error: 'Forbidden' }, 403);
    }

    try {
        const drives = await detectDrives();
        return c.json({ drives });
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

// List volumes with usage stats (Super Admin only)
volumeRoutes.get('/', async (c) => {
    const currentUser = c.get('user');
    if (currentUser.role !== 'superadmin') {
        return c.json({ error: 'Forbidden' }, 403);
    }

    const allVolumes = await db.select().from(volumes);

    // Get object count for each volume
    const volumesWithStats = await Promise.all(allVolumes.map(async (vol) => {
        const [objectCount] = await db.select({ count: sql<number>`count(*)` })
            .from(objectLocations)
            .where(eq(objectLocations.volumeId, vol.id));

        return {
            ...vol,
            objectCount: objectCount?.count || 0,
            usagePercent: vol.capacity > 0 ? Math.round((vol.used / vol.capacity) * 100) : 0,
        };
    }));

    return c.json(volumesWithStats);
});

// Add volume with auto-detection (Super Admin only)
volumeRoutes.post('/', async (c) => {
    const currentUser = c.get('user');
    if (currentUser.role !== 'superadmin') {
        return c.json({ error: 'Forbidden' }, 403);
    }

    const { name, path: volumePath, isDefault } = await c.req.json();
    if (!name || !volumePath) {
        return c.json({ error: 'Name and path required' }, 400);
    }

    // Validate path
    const validation = await validateVolumePath(volumePath);
    if (!validation.valid) {
        return c.json({ error: validation.error }, 400);
    }

    // Auto-detect capacity
    let capacity = 0;
    try {
        const capacityInfo = await getPathCapacity(volumePath);
        capacity = capacityInfo.total;
    } catch (err: any) {
        return c.json({ error: `Failed to detect capacity: ${err.message}` }, 400);
    }

    // If setting as default, unset other defaults
    if (isDefault) {
        await db.update(volumes).set({ isDefault: false });
    }

    try {
        const [newVolume] = await db.insert(volumes).values({
            name,
            path: volumePath,
            capacity,
            used: 0,
            isDefault: isDefault || false,
        }).returning();

        return c.json(newVolume, 201);
    } catch (err) {
        return c.json({ error: 'Volume name must be unique' }, 400);
    }
});

// Update volume (Super Admin only)
volumeRoutes.patch('/:id', async (c) => {
    const currentUser = c.get('user');
    if (currentUser.role !== 'superadmin') {
        return c.json({ error: 'Forbidden' }, 403);
    }

    const id = Number(c.req.param('id'));
    const { name, path: volumePath, isDefault } = await c.req.json();

    const updates: any = {};

    if (name) updates.name = name;
    if (isDefault !== undefined) {
        if (isDefault) {
            // Unset other defaults
            await db.update(volumes).set({ isDefault: false });
        }
        updates.isDefault = isDefault;
    }

    if (volumePath) {
        // Validate new path
        const validation = await validateVolumePath(volumePath);
        if (!validation.valid) {
            return c.json({ error: validation.error }, 400);
        }

        // Re-detect capacity
        try {
            const capacityInfo = await getPathCapacity(volumePath);
            updates.path = volumePath;
            updates.capacity = capacityInfo.total;
        } catch (err: any) {
            return c.json({ error: `Failed to detect capacity: ${err.message}` }, 400);
        }
    }

    try {
        const [updated] = await db.update(volumes)
            .set(updates)
            .where(eq(volumes.id, id))
            .returning();

        return c.json(updated);
    } catch (err) {
        return c.json({ error: 'Failed to update volume' }, 400);
    }
});

// Remove volume (Super Admin only)
volumeRoutes.delete('/:id', async (c) => {
    const currentUser = c.get('user');
    if (currentUser.role !== 'superadmin') {
        return c.json({ error: 'Forbidden' }, 403);
    }

    const id = Number(c.req.param('id'));

    // Check if volume exists
    const [vol] = await db.select().from(volumes).where(eq(volumes.id, id));
    if (!vol) {
        return c.json({ error: 'Volume not found' }, 404);
    }

    // Check if default
    if (vol.isDefault) {
        return c.json({ error: 'Cannot delete default volume' }, 400);
    }

    // Get count of objects and buckets on this volume
    const [objectCount] = await db.select({ count: sql<number>`count(*)` })
        .from(objectLocations)
        .where(eq(objectLocations.volumeId, id));

    const [bucketCount] = await db.select({ count: sql<number>`count(*)` })
        .from(buckets)
        .where(eq(buckets.volumeId, id));

    const objectsToDelete = objectCount?.count || 0;
    const bucketsToReassign = bucketCount?.count || 0;

    // Find another volume to reassign buckets to
    let targetVolume = null;
    if (bucketsToReassign > 0) {
        const [defaultVol] = await db.select()
            .from(volumes)
            .where(eq(volumes.isDefault, true));

        if (defaultVol && defaultVol.id !== id) {
            targetVolume = defaultVol;
        } else {
            // Find any other volume
            const otherVolumes = await db.select()
                .from(volumes)
                .where(sql`${volumes.id} != ${id}`)
                .limit(1);

            if (otherVolumes.length > 0) {
                targetVolume = otherVolumes[0];
            }
        }

        if (!targetVolume) {
            return c.json({
                error: 'Cannot delete the only volume',
                message: 'At least one volume must exist in the system'
            }, 400);
        }
    }

    console.log(`Deleting volume ${id}:`);
    console.log(`  - ${objectsToDelete} objects will be deleted`);
    console.log(`  - ${bucketsToReassign} buckets will be reassigned to volume ${targetVolume?.id}`);

    // Step 1: Delete all objects on this volume
    if (objectsToDelete > 0) {
        const objectsToRemove = await db.select()
            .from(objectLocations)
            .where(eq(objectLocations.volumeId, id));

        for (const obj of objectsToRemove) {
            // Delete physical file
            try {
                if (fs.existsSync(obj.filePath)) {
                    await fs.unlink(obj.filePath);
                }
            } catch (err) {
                console.warn(`Failed to delete file ${obj.filePath}:`, err);
            }
        }

        // Delete object location records
        await db.delete(objectLocations)
            .where(eq(objectLocations.volumeId, id));
    }

    // Step 2: Reassign buckets to another volume
    if (bucketsToReassign > 0 && targetVolume) {
        await db.update(buckets)
            .set({ volumeId: targetVolume.id })
            .where(eq(buckets.volumeId, id));
    }

    // Step 3: Delete the volume
    await db.delete(volumes).where(eq(volumes.id, id));

    return c.json({
        message: 'Volume deleted successfully',
        objectsDeleted: objectsToDelete,
        bucketsReassigned: bucketsToReassign,
        reassignedTo: targetVolume?.name
    });
});

export default volumeRoutes;
