import { Hono } from 'hono';
import { db } from '../../db';
import { buckets } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../../middlewares/auth';

const versioningRoutes = new Hono();

versioningRoutes.use('*', authMiddleware);

// Get versioning status
versioningRoutes.get('/:name/versioning', async (c) => {
    const name = c.req.param('name');

    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, name));
    if (!bucket) {
        return c.json({ error: 'Bucket not found' }, 404);
    }

    return c.json({
        status: bucket.versioningEnabled ? 'Enabled' : 'Suspended',
        versioningEnabled: bucket.versioningEnabled,
    });
});

// Enable/suspend versioning
versioningRoutes.put('/:name/versioning', async (c) => {
    const name = c.req.param('name');
    const { status } = await c.req.json();

    if (!['Enabled', 'Suspended'].includes(status)) {
        return c.json({ error: 'Invalid status. Must be "Enabled" or "Suspended"' }, 400);
    }

    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, name));
    if (!bucket) {
        return c.json({ error: 'Bucket not found' }, 404);
    }

    await db.update(buckets)
        .set({ versioningEnabled: status === 'Enabled' })
        .where(eq(buckets.id, bucket.id));

    return c.body(null, 204);
});

export default versioningRoutes;
