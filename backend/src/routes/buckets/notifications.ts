import { Hono } from 'hono';
import { db } from '../../db';
import { buckets } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { registerWebhook, listWebhooks, deleteWebhook, emitEvent, triggerWebhook, EventPayload } from '../../services/events';
import { v4 as uuidv4 } from 'uuid';

const notificationRoutes = new Hono();

// List Notifications
notificationRoutes.get('/:name/notifications', async (c) => {
    const bucketName = c.req.param('name');

    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, bucketName));
    if (!bucket) {
        return c.json({ error: 'Bucket not found' }, 404);
    }

    const webhooks = await listWebhooks(bucket.id);
    return c.json(webhooks);
});

// Create Notification
notificationRoutes.post('/:name/notifications', async (c) => {
    const bucketName = c.req.param('name');
    const { eventType, webhookUrl } = await c.req.json();

    if (!eventType || !webhookUrl) {
        return c.json({ error: 'Event type and webhook URL are required' }, 400);
    }

    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, bucketName));
    if (!bucket) {
        return c.json({ error: 'Bucket not found' }, 404);
    }

    try {
        const notification = await registerWebhook(bucket.id, eventType, webhookUrl);
        return c.json(notification, 201);
    } catch (error: any) {
        console.error('Failed to register webhook:', error);
        return c.json({ error: 'Failed to register webhook' }, 500);
    }
});

// Delete Notification
notificationRoutes.delete('/:name/notifications/:id', async (c) => {
    const bucketName = c.req.param('name');
    const id = parseInt(c.req.param('id'));

    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, bucketName));
    if (!bucket) {
        return c.json({ error: 'Bucket not found' }, 404);
    }

    await deleteWebhook(id);
    return c.body(null, 204);
});

// Test Notification
notificationRoutes.post('/:name/notifications/test', async (c) => {
    const bucketName = c.req.param('name');
    const { webhookUrl } = await c.req.json();

    if (!webhookUrl) {
        return c.json({ error: 'Webhook URL is required' }, 400);
    }

    try {
        // Emit a test event directly to the URL
        const testPayload: EventPayload = {
            Records: [{
                eventVersion: '2.1',
                eventSource: 'aws:s3',
                awsRegion: 'us-east-1',
                eventTime: new Date().toISOString(),
                eventName: 's3:TestEvent',
                s3: {
                    s3SchemaVersion: '1.0',
                    configurationId: 'TestConfig',
                    bucket: {
                        name: bucketName,
                        ownerIdentity: {
                            principalId: 'v2-capsule'
                        },
                        arn: `arn:aws:s3:::${bucketName}`
                    },
                    object: {
                        key: 'test-object',
                        size: 0,
                        eTag: 'test-etag',
                        versionId: 'test-version',
                        sequencer: uuidv4()
                    }
                }
            }]
        };

        await triggerWebhook(webhookUrl, testPayload);

        return c.json({ message: 'Test event triggered successfully' });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

export { notificationRoutes };
