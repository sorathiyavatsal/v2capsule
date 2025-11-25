import { Hono } from 'hono';
import { db } from '../../db';
import { buckets, bucketCors } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../../middlewares/auth';

const corsRoutes = new Hono();

corsRoutes.use('*', authMiddleware);

// Get CORS Configuration
corsRoutes.get('/:name/cors', async (c) => {
    const name = c.req.param('name');

    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, name));
    if (!bucket) {
        return c.json({ error: 'Bucket not found' }, 404);
    }

    const [corsConfig] = await db.select().from(bucketCors).where(eq(bucketCors.bucketId, bucket.id));

    if (!corsConfig) {
        return c.json({ error: 'CORS configuration not found', code: 'NoSuchCORSConfiguration' }, 404);
    }

    return c.json(JSON.parse(corsConfig.corsRules as string));
});

// Set CORS Configuration
corsRoutes.put('/:name/cors', async (c) => {
    const name = c.req.param('name');
    const corsRules = await c.req.json();

    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, name));
    if (!bucket) {
        return c.json({ error: 'Bucket not found' }, 404);
    }

    // Validate CORS rules structure
    if (!Array.isArray(corsRules)) {
        return c.json({ error: 'CORS rules must be an array' }, 400);
    }

    for (const rule of corsRules) {
        if (!rule.allowedOrigins || !Array.isArray(rule.allowedOrigins)) {
            return c.json({ error: 'Each rule must have allowedOrigins array' }, 400);
        }
        if (!rule.allowedMethods || !Array.isArray(rule.allowedMethods)) {
            return c.json({ error: 'Each rule must have allowedMethods array' }, 400);
        }
    }

    // Check if CORS config exists
    const [existing] = await db.select().from(bucketCors).where(eq(bucketCors.bucketId, bucket.id));

    if (existing) {
        await db.update(bucketCors)
            .set({ corsRules: JSON.stringify(corsRules) })
            .where(eq(bucketCors.id, existing.id));
    } else {
        await db.insert(bucketCors).values({
            bucketId: bucket.id,
            corsRules: JSON.stringify(corsRules),
        });
    }

    return c.body(null, 204);
});

// Delete CORS Configuration
corsRoutes.delete('/:name/cors', async (c) => {
    const name = c.req.param('name');

    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, name));
    if (!bucket) {
        return c.json({ error: 'Bucket not found' }, 404);
    }

    await db.delete(bucketCors).where(eq(bucketCors.bucketId, bucket.id));

    return c.body(null, 204);
});

export default corsRoutes;
