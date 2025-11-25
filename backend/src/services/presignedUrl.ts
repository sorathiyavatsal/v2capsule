import crypto from 'crypto';
import { db } from '../db/index.js';
import { buckets } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface PresignedUrlOptions {
    bucket: string;
    key: string;
    operation: 'GET' | 'PUT' | 'DELETE';
    expiresIn: number; // seconds
}

export interface PresignedUrlResult {
    url: string;
    expiresAt: Date;
}

/**
 * Generate a pre-signed URL for temporary access to an S3 object
 */
export async function generatePresignedUrl(options: PresignedUrlOptions): Promise<PresignedUrlResult> {
    const { bucket, key, operation, expiresIn } = options;

    // Get bucket to retrieve its secret key
    const [bucketRecord] = await db.select().from(buckets).where(eq(buckets.name, bucket));
    if (!bucketRecord) {
        throw new Error('Bucket not found');
    }

    if (!bucketRecord.secretKey) {
        throw new Error('Bucket does not have a secret key configured');
    }

    // Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const expiresTimestamp = Math.floor(expiresAt.getTime() / 1000);

    // Create signature
    const signature = createSignature(bucket, key, operation, expiresTimestamp, bucketRecord.secretKey);

    // Build URL
    const baseUrl = process.env.API_URL || 'http://localhost:8787';
    const url = `${baseUrl}/${bucket}/${key}?signature=${signature}&expires=${expiresTimestamp}&operation=${operation}`;

    return {
        url,
        expiresAt,
    };
}

/**
 * Validate a pre-signed URL signature
 */
export function validatePresignedUrl(
    bucket: string,
    key: string,
    operation: string,
    signature: string,
    expires: string,
    secretKey: string
): boolean {
    // Check if URL has expired
    const expiresTimestamp = parseInt(expires, 10);
    const now = Math.floor(Date.now() / 1000);

    if (now > expiresTimestamp) {
        return false; // URL has expired
    }

    // Verify signature
    const expectedSignature = createSignature(bucket, key, operation, expiresTimestamp, secretKey);

    return signature === expectedSignature;
}

/**
 * Create HMAC signature for pre-signed URL
 */
function createSignature(
    bucket: string,
    key: string,
    operation: string,
    expiresTimestamp: number,
    secretKey: string
): string {
    // Create string to sign
    const stringToSign = `${operation}\n${bucket}\n${key}\n${expiresTimestamp}`;

    // Create HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(stringToSign);

    return hmac.digest('hex');
}
