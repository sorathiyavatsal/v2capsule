import { Hono } from 'hono';
import { generatePresignedUrl } from '../services/presignedUrl.js';
import { authMiddleware } from '../middlewares/auth.js';

const presignedRoutes = new Hono();

// Require authentication for generating pre-signed URLs
presignedRoutes.use('*', authMiddleware);

// Generate pre-signed URL
presignedRoutes.post('/', async (c) => {
    const { bucket, key, operation, expiresIn } = await c.req.json();

    // Validate input
    if (!bucket || !key) {
        return c.json({ error: 'Bucket and key are required' }, 400);
    }

    if (!operation || !['GET', 'PUT', 'DELETE'].includes(operation)) {
        return c.json({ error: 'Operation must be GET, PUT, or DELETE' }, 400);
    }

    const expires = expiresIn || 3600; // Default 1 hour

    if (expires < 1 || expires > 604800) { // Max 7 days
        return c.json({ error: 'expiresIn must be between 1 and 604800 seconds (7 days)' }, 400);
    }

    try {
        const result = await generatePresignedUrl({
            bucket,
            key,
            operation,
            expiresIn: expires,
        });

        return c.json({
            url: result.url,
            expiresAt: result.expiresAt.toISOString(),
            expiresIn: expires,
        });
    } catch (error: any) {
        return c.json({ error: error.message || 'Failed to generate pre-signed URL' }, 500);
    }
});

export default presignedRoutes;
