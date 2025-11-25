import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export interface EncryptionResult {
    encryptedData: Buffer;
    iv: string; // hex
    authTag: string; // hex
}

export function generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
}

export function encryptObject(data: Buffer, keyHex: string): EncryptionResult {
    const key = Buffer.from(keyHex, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
    };
}

export function decryptObject(encryptedData: Buffer, keyHex: string, ivHex: string, authTagHex: string): Buffer {
    const key = Buffer.from(keyHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
}

export function validateSSECHeaders(headers: Record<string, string | undefined>): string | null {
    const algo = headers['x-amz-server-side-encryption-customer-algorithm'];
    const keyBase64 = headers['x-amz-server-side-encryption-customer-key'];
    const keyMd5 = headers['x-amz-server-side-encryption-customer-key-md5'];

    if (!algo && !keyBase64) return null; // Not SSE-C

    if (algo !== 'AES256') {
        throw new Error('Invalid encryption algorithm. Only AES256 is supported.');
    }

    if (!keyBase64) {
        throw new Error('Missing customer key.');
    }

    const keyBuffer = Buffer.from(keyBase64, 'base64');
    if (keyBuffer.length !== 32) {
        throw new Error('Invalid key length. Key must be 32 bytes (AES-256).');
    }

    if (keyMd5) {
        const calculatedMd5 = crypto.createHash('md5').update(keyBuffer).digest('base64');
        if (calculatedMd5 !== keyMd5) {
            throw new Error('Key MD5 mismatch.');
        }
    }

    return keyBuffer.toString('hex');
}

/**
 * Rotate encryption key by decrypting with old key and re-encrypting with new key
 */
export function rotateEncryptionKey(
    encryptedData: Buffer,
    oldKeyHex: string,
    oldIvHex: string,
    oldAuthTagHex: string,
    newKeyHex: string
): EncryptionResult {
    // Decrypt with old key
    const decryptedData = decryptObject(encryptedData, oldKeyHex, oldIvHex, oldAuthTagHex);

    // Re-encrypt with new key
    return encryptObject(decryptedData, newKeyHex);
}
