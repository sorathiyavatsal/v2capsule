import { db } from '../db';
import { eventNotifications, buckets } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface EventPayload {
    Records: Array<{
        eventVersion: string;
        eventSource: string;
        awsRegion: string;
        eventTime: string;
        eventName: string;
        s3: {
            s3SchemaVersion: string;
            configurationId: string;
            bucket: {
                name: string;
                ownerIdentity: {
                    principalId: string;
                };
                arn: string;
            };
            object: {
                key: string;
                size?: number;
                eTag?: string;
                versionId?: string;
                sequencer: string;
            };
        };
    }>;
}

export async function registerWebhook(bucketId: number, eventType: string, webhookUrl: string) {
    const [notification] = await db.insert(eventNotifications).values({
        bucketId,
        eventType,
        webhookUrl,
        isActive: true,
    }).returning();
    return notification;
}

export async function listWebhooks(bucketId: number) {
    return await db.select().from(eventNotifications).where(eq(eventNotifications.bucketId, bucketId));
}

export async function deleteWebhook(id: number) {
    await db.delete(eventNotifications).where(eq(eventNotifications.id, id));
}

export async function emitEvent(bucketId: number, eventType: string, payload: any) {
    // Find all matching webhooks
    // We support simple wildcard matching: "s3:ObjectCreated:*" matches "s3:ObjectCreated:Put"
    const webhooks = await db.select().from(eventNotifications)
        .where(and(
            eq(eventNotifications.bucketId, bucketId),
            eq(eventNotifications.isActive, true)
        ));

    const matchingWebhooks = webhooks.filter(wh => {
        if (wh.eventType === eventType) return true;
        if (wh.eventType.endsWith('*')) {
            const prefix = wh.eventType.slice(0, -1);
            return eventType.startsWith(prefix);
        }
        return false;
    });

    // Construct S3-compatible event payload
    const s3Event: EventPayload = {
        Records: [{
            eventVersion: '2.1',
            eventSource: 'aws:s3',
            awsRegion: 'us-east-1', // Mock region
            eventTime: new Date().toISOString(),
            eventName: eventType,
            s3: {
                s3SchemaVersion: '1.0',
                configurationId: 'Config',
                bucket: {
                    name: payload.bucketName,
                    ownerIdentity: {
                        principalId: 'v2-capsule'
                    },
                    arn: `arn:aws:s3:::${payload.bucketName}`
                },
                object: {
                    key: payload.objectKey,
                    size: payload.size,
                    eTag: payload.etag,
                    versionId: payload.versionId,
                    sequencer: uuidv4()
                }
            }
        }]
    };

    // Trigger webhooks asynchronously
    matchingWebhooks.forEach(wh => {
        triggerWebhook(wh.webhookUrl, s3Event).catch(err => {
            console.error(`Failed to trigger webhook ${wh.id} for event ${eventType}:`, err);
        });
    });
}

export async function triggerWebhook(url: string, payload: EventPayload, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'V2-Capsule-S3-Event-Notification'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                return;
            }

            console.warn(`Webhook attempt ${i + 1} failed with status: ${response.status}`);
        } catch (error) {
            console.warn(`Webhook attempt ${i + 1} failed with error:`, error);
        }

        // Exponential backoff
        if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }
    throw new Error(`Failed to deliver webhook to ${url} after ${retries} attempts`);
}
