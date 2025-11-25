import { Hono } from 'hono';
import { db } from '../../db';
import { buckets, bucketPolicies } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../../middlewares/auth';
import { validatePolicyDocument } from '../../services/policyEngine';

const policyRoutes = new Hono();

policyRoutes.use('*', authMiddleware);

// Get Bucket Policy
policyRoutes.get('/:name/policy', async (c) => {
    const name = c.req.param('name');

    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, name));
    if (!bucket) {
        return c.json({ error: 'Bucket not found' }, 404);
    }

    const [policy] = await db.select().from(bucketPolicies).where(eq(bucketPolicies.bucketId, bucket.id));

    if (!policy) {
        return c.json({ error: 'The bucket policy does not exist', code: 'NoSuchBucketPolicy' }, 404);
    }

    return c.json(JSON.parse(policy.policy as string));
});

// Set Bucket Policy
policyRoutes.put('/:name/policy', async (c) => {
    const name = c.req.param('name');
    const policyJson = await c.req.json();

    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, name));
    if (!bucket) {
        return c.json({ error: 'Bucket not found' }, 404);
    }

    // Validate Policy
    const error = validatePolicyDocument(policyJson);
    if (error) {
        return c.json({ error: `Invalid policy: ${error}` }, 400);
    }

    const policyString = JSON.stringify(policyJson);

    // Update bucket.policy field for S3 route access
    await db.update(buckets)
        .set({ policy: policyString })
        .where(eq(buckets.id, bucket.id));

    // Also update bucketPolicies table for backward compatibility
    const [existing] = await db.select().from(bucketPolicies).where(eq(bucketPolicies.bucketId, bucket.id));

    if (existing) {
        await db.update(bucketPolicies)
            .set({ policy: policyString })
            .where(eq(bucketPolicies.id, existing.id));
    } else {
        await db.insert(bucketPolicies).values({
            bucketId: bucket.id,
            policy: policyString,
        });
    }

    return c.body(null, 204);
});

// Delete Bucket Policy
policyRoutes.delete('/:name/policy', async (c) => {
    const name = c.req.param('name');

    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, name));
    if (!bucket) {
        return c.json({ error: 'Bucket not found' }, 404);
    }

    // Clear bucket.policy field
    await db.update(buckets)
        .set({ policy: null })
        .where(eq(buckets.id, bucket.id));

    // Also delete from bucketPolicies table
    await db.delete(bucketPolicies).where(eq(bucketPolicies.bucketId, bucket.id));

    return c.body(null, 204);
});

export default policyRoutes;
