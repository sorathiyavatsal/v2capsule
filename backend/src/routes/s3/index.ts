import { Hono } from 'hono';
import { db } from '../../db';
import { buckets, volumes, users, objectLocations } from '../../db/schema';
import { buildS3Response, buildErrorResponse } from '../../services/s3';
import { selectVolumeForUpload, incrementVolumeUsage, decrementVolumeUsage } from '../../services/volumeManager';
import { validatePresignedUrl } from '../../services/presignedUrl';
import {
    initiateMultipartUpload,
    uploadPart,
    completeMultipartUpload,
    abortMultipartUpload,
    listParts
} from '../../services/multipart';
import { copyObject } from '../../services/object';
import { encryptObject, decryptObject, generateEncryptionKey, validateSSECHeaders } from '../../services/encryption';
import { createVersion, createDeleteMarker, getVersion, listVersions, deleteVersion } from '../../services/versioning';
import { evaluatePolicy } from '../../services/policyEngine';
import { eq, and } from 'drizzle-orm';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { emitEvent } from '../../services/events';

const s3Routes = new Hono();

// Debug middleware to log all S3 requests
s3Routes.use('*', async (c, next) => {
    console.log('[S3 Debug] Incoming request:', c.req.method, c.req.path, 'Query:', c.req.query());
    await next();
});

// Middleware to simulate S3 Auth (Simplified for now - just checks Access Key if present)
// In a real scenario, we'd verify the AWS Signature V4.
// For this MVP, we'll assume the client sends Authorization header or we just allow public for now if no auth.
// But to map to users, we need some auth.
// Let's implement a basic check: if 'Authorization' header exists, try to parse access key.
// AWS Auth header format: AWS4-HMAC-SHA256 Credential=ACCESS_KEY/...
// This is complex to parse fully without a library.
// For now, we will implement the routes.

// List Buckets
s3Routes.get('/', async (c) => {
    // TODO: Extract user from Auth header to filter buckets.
    // For now, list all buckets (or public ones).

    const allBuckets = await db.select().from(buckets);

    const response = {
        Owner: {
            ID: 'v2-capsule',
            DisplayName: 'v2-capsule'
        },
        Buckets: {
            Bucket: allBuckets.map(b => ({
                Name: b.name,
                CreationDate: b.createdAt?.toISOString()
            }))
        }
    };

    return c.text(buildS3Response('ListAllMyBucketsResult', response), 200, { 'Content-Type': 'application/xml' });
});

// List Objects in Bucket (ListObjectsV2)
// This route handles both ListObjectsV2 (with list-type=2 query param) and ListObjects
// Handle both with and without trailing slash
s3Routes.get('/:bucket/', async (c) => {
    console.log('[S3 List] Route hit (with slash)! Full path:', c.req.path);
    console.log('[S3 List] Full URL:', c.req.url);

    const bucketName = c.req.param('bucket');
    const listType = c.req.query('list-type');
    const prefix = c.req.query('prefix') || '';
    const delimiter = c.req.query('delimiter') || '';
    const maxKeys = parseInt(c.req.query('max-keys') || '1000');
    const versions = c.req.query('versions');

    console.log('[S3 List] Bucket name:', bucketName);
    console.log('[S3 List] Query params:', { listType, prefix, delimiter, maxKeys });

    // Check if bucket exists
    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, bucketName));
    console.log('[S3 List] Bucket found:', bucket ? `Yes (ID: ${bucket.id})` : 'No');

    if (!bucket) {
        console.log('[S3 List] Returning 404 - bucket not found');
        return c.text(buildErrorResponse('NoSuchBucket', 'The specified bucket does not exist', bucketName, uuidv4()), 404, { 'Content-Type': 'application/xml' });
    }

    // Handle List Versions
    if (versions !== undefined) {
        const allVersions = await listVersions(bucket.id);

        // Filter by prefix if provided
        let filteredVersions = allVersions;
        if (prefix) {
            filteredVersions = allVersions.filter(v => v.key.startsWith(prefix));
        }

        const versionContents = filteredVersions.map(v => ({
            Key: v.key,
            VersionId: v.versionId,
            IsLatest: v.isLatest,
            LastModified: v.lastModified?.toISOString(),
            ETag: `"${uuidv4()}"`, // In a real app, we'd store ETag
            Size: v.size,
            Owner: {
                ID: 'v2-capsule',
                DisplayName: 'v2-capsule'
            },
            StorageClass: 'STANDARD'
        }));

        // Separate delete markers if needed, for now just list them all
        // S3 separates Versions and DeleteMarkers in the response

        const versionItems = versionContents.filter(v => !v.IsLatest || (v.IsLatest && !filteredVersions.find(fv => fv.versionId === v.VersionId)?.isDeleteMarker));
        // This logic is a bit simplified. S3 response structure for versions is different.
        // Let's build a simple ListVersionsResult

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListVersionsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <Name>${bucketName}</Name>
    <Prefix>${prefix}</Prefix>
    <KeyMarker></KeyMarker>
    <VersionIdMarker></VersionIdMarker>
    <MaxKeys>${maxKeys}</MaxKeys>
    <IsTruncated>false</IsTruncated>
    ${filteredVersions.map(v => {
            if (v.isDeleteMarker) {
                return `<DeleteMarker>
        <Key>${v.key}</Key>
        <VersionId>${v.versionId}</VersionId>
        <IsLatest>${v.isLatest}</IsLatest>
        <LastModified>${v.lastModified?.toISOString()}</LastModified>
        <Owner>
            <ID>v2-capsule</ID>
            <DisplayName>v2-capsule</DisplayName>
        </Owner>
    </DeleteMarker>`;
            } else {
                return `<Version>
        <Key>${v.key}</Key>
        <VersionId>${v.versionId}</VersionId>
        <IsLatest>${v.isLatest}</IsLatest>
        <LastModified>${v.lastModified?.toISOString()}</LastModified>
        <ETag>"${uuidv4()}"</ETag>
        <Size>${v.size}</Size>
        <Owner>
            <ID>v2-capsule</ID>
            <DisplayName>v2-capsule</DisplayName>
        </Owner>
        <StorageClass>STANDARD</StorageClass>
    </Version>`;
            }
        }).join('')}
</ListVersionsResult>`;

        return c.text(xml, 200, { 'Content-Type': 'application/xml' });
    }

    // Get all objects in this bucket
    const allObjects = await db.select()
        .from(objectLocations)
        .where(eq(objectLocations.bucketId, bucket.id));

    // Filter by prefix if provided
    let filteredObjects = allObjects;
    if (prefix) {
        filteredObjects = allObjects.filter(obj => obj.objectKey.startsWith(prefix));
    }

    // Handle delimiter for directory-like listing
    const contents: any[] = [];
    const commonPrefixes: Set<string> = new Set();

    if (delimiter) {
        for (const obj of filteredObjects) {
            const keyAfterPrefix = obj.objectKey.substring(prefix.length);
            const delimiterIndex = keyAfterPrefix.indexOf(delimiter);

            if (delimiterIndex === -1) {
                // No delimiter found, it's a file at this level
                contents.push({
                    Key: obj.objectKey,
                    LastModified: obj.createdAt?.toISOString(),
                    ETag: `"${uuidv4()}"`,
                    Size: obj.size,
                    StorageClass: 'STANDARD'
                });
            } else {
                // Delimiter found, it's a "directory"
                const commonPrefix = prefix + keyAfterPrefix.substring(0, delimiterIndex + 1);
                commonPrefixes.add(commonPrefix);
            }
        }
    } else {
        // No delimiter, return all objects
        filteredObjects.forEach(obj => {
            contents.push({
                Key: obj.objectKey,
                LastModified: obj.createdAt?.toISOString(),
                ETag: `"${uuidv4()}"`,
                Size: obj.size,
                StorageClass: 'STANDARD'
            });
        });
    }

    // Limit to maxKeys
    const limitedContents = contents.slice(0, maxKeys);
    const isTruncated = contents.length > maxKeys;

    // Build response based on list-type
    if (listType === '2') {
        // ListObjectsV2 response
        const response: any = {
            Name: bucketName,
            Prefix: prefix,
            KeyCount: limitedContents.length,
            MaxKeys: maxKeys,
            IsTruncated: isTruncated,
        };

        if (delimiter) {
            response.Delimiter = delimiter;
        }

        if (limitedContents.length > 0) {
            response.Contents = limitedContents;
        }

        if (commonPrefixes.size > 0) {
            response.CommonPrefixes = Array.from(commonPrefixes).map(p => ({ Prefix: p }));
        }

        return c.text(buildS3Response('ListBucketResult', response), 200, { 'Content-Type': 'application/xml' });
    } else {
        // ListObjects (v1) response
        const response: any = {
            Name: bucketName,
            Prefix: prefix,
            MaxKeys: maxKeys,
            IsTruncated: isTruncated,
        };

        if (delimiter) {
            response.Delimiter = delimiter;
        }

        if (limitedContents.length > 0) {
            response.Contents = limitedContents;
        }

        if (commonPrefixes.size > 0) {
            response.CommonPrefixes = Array.from(commonPrefixes).map(p => ({ Prefix: p }));
        }

        return c.text(buildS3Response('ListBucketResult', response), 200, { 'Content-Type': 'application/xml' });
    }
});

s3Routes.get('/:bucket', async (c) => {
    console.log('[S3 List] Route hit! Full path:', c.req.path);
    console.log('[S3 List] Full URL:', c.req.url);

    const bucketName = c.req.param('bucket');
    const listType = c.req.query('list-type');
    const prefix = c.req.query('prefix') || '';
    const delimiter = c.req.query('delimiter') || '';
    const maxKeys = parseInt(c.req.query('max-keys') || '1000');

    console.log('[S3 List] Bucket name:', bucketName);
    console.log('[S3 List] Query params:', { listType, prefix, delimiter, maxKeys });

    // Check if bucket exists
    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, bucketName));
    console.log('[S3 List] Bucket found:', bucket ? `Yes (ID: ${bucket.id})` : 'No');

    if (!bucket) {
        console.log('[S3 List] Returning 404 - bucket not found');
        return c.text(buildErrorResponse('NoSuchBucket', 'The specified bucket does not exist', bucketName, uuidv4()), 404, { 'Content-Type': 'application/xml' });
    }

    // Get all objects in this bucket
    const allObjects = await db.select()
        .from(objectLocations)
        .where(eq(objectLocations.bucketId, bucket.id));

    // Filter by prefix if provided
    let filteredObjects = allObjects;
    if (prefix) {
        filteredObjects = allObjects.filter(obj => obj.objectKey.startsWith(prefix));
    }

    // Handle delimiter for directory-like listing
    const contents: any[] = [];
    const commonPrefixes: Set<string> = new Set();

    if (delimiter) {
        for (const obj of filteredObjects) {
            const keyAfterPrefix = obj.objectKey.substring(prefix.length);
            const delimiterIndex = keyAfterPrefix.indexOf(delimiter);

            if (delimiterIndex === -1) {
                // No delimiter found, it's a file at this level
                contents.push({
                    Key: obj.objectKey,
                    LastModified: obj.createdAt?.toISOString(),
                    ETag: `"${uuidv4()}"`,
                    Size: obj.size,
                    StorageClass: 'STANDARD'
                });
            } else {
                // Delimiter found, it's a "directory"
                const commonPrefix = prefix + keyAfterPrefix.substring(0, delimiterIndex + 1);
                commonPrefixes.add(commonPrefix);
            }
        }
    } else {
        // No delimiter, return all objects
        filteredObjects.forEach(obj => {
            contents.push({
                Key: obj.objectKey,
                LastModified: obj.createdAt?.toISOString(),
                ETag: `"${uuidv4()}"`,
                Size: obj.size,
                StorageClass: 'STANDARD'
            });
        });
    }

    // Limit to maxKeys
    const limitedContents = contents.slice(0, maxKeys);
    const isTruncated = contents.length > maxKeys;

    // Build response based on list-type
    if (listType === '2') {
        // ListObjectsV2 response
        const response: any = {
            Name: bucketName,
            Prefix: prefix,
            KeyCount: limitedContents.length,
            MaxKeys: maxKeys,
            IsTruncated: isTruncated,
        };

        if (delimiter) {
            response.Delimiter = delimiter;
        }

        if (limitedContents.length > 0) {
            response.Contents = limitedContents;
        }

        if (commonPrefixes.size > 0) {
            response.CommonPrefixes = Array.from(commonPrefixes).map(p => ({ Prefix: p }));
        }

        return c.text(buildS3Response('ListBucketResult', response), 200, { 'Content-Type': 'application/xml' });
    } else {
        // ListObjects (v1) response
        const response: any = {
            Name: bucketName,
            Prefix: prefix,
            MaxKeys: maxKeys,
            IsTruncated: isTruncated,
        };

        if (delimiter) {
            response.Delimiter = delimiter;
        }

        if (limitedContents.length > 0) {
            response.Contents = limitedContents;
        }

        if (commonPrefixes.size > 0) {
            response.CommonPrefixes = Array.from(commonPrefixes).map(p => ({ Prefix: p }));
        }

        return c.text(buildS3Response('ListBucketResult', response), 200, { 'Content-Type': 'application/xml' });
    }
});

// Create Bucket
s3Routes.put('/:bucket', async (c) => {
    const bucketName = c.req.param('bucket');

    // Check if bucket exists
    const existing = await db.select().from(buckets).where(eq(buckets.name, bucketName));
    if (existing.length > 0) {
        return c.text(buildErrorResponse('BucketAlreadyExists', 'The requested bucket name is not available', bucketName, uuidv4()), 409, { 'Content-Type': 'application/xml' });
    }

    // Get default volume
    const [defaultVol] = await db.select().from(volumes).where(eq(volumes.isDefault, true));
    if (!defaultVol) {
        return c.text(buildErrorResponse('InternalError', 'No storage volume available', bucketName, uuidv4()), 500, { 'Content-Type': 'application/xml' });
    }

    // Create directory
    const bucketPath = path.join(defaultVol.path, bucketName);
    await fs.ensureDir(bucketPath);

    // Insert into DB
    await db.insert(buckets).values({
        name: bucketName,
        volumeId: defaultVol.id,
        // ownerId: user.id // TODO: Link to user
    });

    return c.text('', 200, { 'Location': `/${bucketName}` });
});

// Delete Bucket
s3Routes.delete('/:bucket', async (c) => {
    const bucketName = c.req.param('bucket');

    // Check if bucket exists
    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, bucketName));
    if (!bucket) {
        return c.text(buildErrorResponse('NoSuchBucket', 'The specified bucket does not exist', bucketName, uuidv4()), 404, { 'Content-Type': 'application/xml' });
    }

    // Check if bucket is empty
    const objects = await db.select()
        .from(objectLocations)
        .where(eq(objectLocations.bucketId, bucket.id));

    if (objects.length > 0) {
        return c.text(buildErrorResponse('BucketNotEmpty', 'The bucket you tried to delete is not empty', bucketName, uuidv4()), 409, { 'Content-Type': 'application/xml' });
    }

    // Get bucket's volume to find the directory path
    const [volume] = await db.select().from(volumes).where(eq(volumes.id, bucket.volumeId));

    if (volume) {
        const bucketPath = path.join(volume.path, bucketName);

        // Remove bucket directory if it exists
        if (fs.existsSync(bucketPath)) {
            try {
                await fs.rmdir(bucketPath);
            } catch (error) {
                console.error(`Failed to remove bucket directory: ${bucketPath}`, error);
                // Continue with database deletion even if directory removal fails
            }
        }
    }

    // Delete bucket from database (this will cascade delete related records if configured)
    await db.delete(buckets).where(eq(buckets.id, bucket.id));

    return c.body(null, 204);
});

// Multipart Upload: Initiate (POST ?uploads) & Complete (POST ?uploadId)
s3Routes.post('/:bucket/:key{.+}', async (c) => {
    const bucketName = c.req.param('bucket');
    const key = c.req.param('key');
    const uploadId = c.req.query('uploadId');
    const uploads = c.req.query('uploads');

    try {
        if (uploads !== undefined) {
            // Initiate Multipart Upload
            const metadata = {
                contentType: c.req.header('content-type'),
                // Add other metadata headers here
            };
            const newUploadId = await initiateMultipartUpload(bucketName, key, metadata);

            // Return XML response
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
<InitiateMultipartUploadResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Bucket>${bucketName}</Bucket>
  <Key>${key}</Key>
  <UploadId>${newUploadId}</UploadId>
</InitiateMultipartUploadResult>`;

            return c.text(xml, 200, { 'Content-Type': 'application/xml' });
        } else if (uploadId) {
            // Complete Multipart Upload
            const body = await c.req.text();

            // Parse XML body to get parts
            // Simple regex parsing for now (robust XML parser recommended for production)
            const parts: { PartNumber: number; ETag: string }[] = [];
            const partMatches = body.matchAll(/<Part>[\s\S]*?<PartNumber>(\d+)<\/PartNumber>[\s\S]*?<ETag>(.*?)<\/ETag>[\s\S]*?<\/Part>/g);

            for (const match of partMatches) {
                parts.push({
                    PartNumber: parseInt(match[1]),
                    ETag: match[2]
                });
            }

            const result = await completeMultipartUpload(bucketName, key, uploadId, parts);

            // Emit Event
            emitEvent(result.bucketId, 's3:ObjectCreated:CompleteMultipartUpload', {
                bucketName,
                objectKey: key,
                size: result.size,
                etag: result.etag,
                versionId: result.versionId
            }).catch(console.error);

            const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CompleteMultipartUploadResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Location>${result.location}</Location>
  <Bucket>${result.bucket}</Bucket>
  <Key>${result.key}</Key>
  <ETag>${result.etag}</ETag>
</CompleteMultipartUploadResult>`;

            return c.text(xml, 200, { 'Content-Type': 'application/xml' });
        }

        return c.text(buildErrorResponse('MethodNotAllowed', 'Method not allowed', key, uuidv4()), 405, { 'Content-Type': 'application/xml' });
    } catch (error: any) {
        console.error('Multipart POST error:', error);
        return c.text(buildErrorResponse('InternalError', error.message, key, uuidv4()), 500, { 'Content-Type': 'application/xml' });
    }
});

// Put Object
s3Routes.put('/:bucket/:key{.+}', async (c) => {
    const bucketName = c.req.param('bucket');
    const key = c.req.param('key');
    const partNumber = c.req.query('partNumber');
    const uploadId = c.req.query('uploadId');

    // Handle Copy Object
    const copySource = c.req.header('x-amz-copy-source');
    if (copySource) {
        try {
            // Parse copy source: /bucket/key or bucket/key
            const decodedSource = decodeURIComponent(copySource);
            const match = decodedSource.match(/^\/?([^/]+)\/(.+)$/);
            if (!match) {
                return c.text(buildErrorResponse('InvalidArgument', 'Invalid copy source format', key, uuidv4()), 400, { 'Content-Type': 'application/xml' });
            }
            const [, sourceBucket, sourceKey] = match;

            const metadataDirective = (c.req.header('x-amz-metadata-directive') as 'COPY' | 'REPLACE') || 'COPY';

            // Extract metadata from headers if REPLACE
            let newMetadata: any = {};
            if (metadataDirective === 'REPLACE') {
                const headers = c.req.header();
                for (const [k, v] of Object.entries(headers)) {
                    if (k.toLowerCase().startsWith('x-amz-meta-')) {
                        newMetadata[k.toLowerCase().substring(11)] = v;
                    }
                }
            }

            // Extract conditional headers
            const conditionalHeaders: any = {};
            const ifMatch = c.req.header('x-amz-copy-source-if-match');
            const ifNoneMatch = c.req.header('x-amz-copy-source-if-none-match');
            const ifModifiedSince = c.req.header('x-amz-copy-source-if-modified-since');
            const ifUnmodifiedSince = c.req.header('x-amz-copy-source-if-unmodified-since');

            if (ifMatch) conditionalHeaders.ifMatch = ifMatch;
            if (ifNoneMatch) conditionalHeaders.ifNoneMatch = ifNoneMatch;
            if (ifModifiedSince) conditionalHeaders.ifModifiedSince = new Date(ifModifiedSince);
            if (ifUnmodifiedSince) conditionalHeaders.ifUnmodifiedSince = new Date(ifUnmodifiedSince);

            const result = await copyObject(
                sourceBucket,
                sourceKey,
                bucketName,
                key,
                metadataDirective,
                newMetadata,
                Object.keys(conditionalHeaders).length > 0 ? conditionalHeaders : undefined
            );

            // Emit Event
            emitEvent(result.bucketId, 's3:ObjectCreated:Copy', {
                bucketName,
                objectKey: key,
                size: result.size,
                etag: result.etag,
                versionId: result.versionId
            }).catch(console.error);

            const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CopyObjectResult>
    <LastModified>${(result.lastModified || new Date()).toISOString()}</LastModified>
    <ETag>${result.etag}</ETag>
</CopyObjectResult>`;
            return c.text(xml, 200, { 'Content-Type': 'application/xml' });

        } catch (error: any) {
            console.error('Copy Object error:', error);
            return c.text(buildErrorResponse('InternalError', error.message, key, uuidv4()), 500, { 'Content-Type': 'application/xml' });
        }
    }

    if (partNumber && uploadId) {
        try {
            const arrayBuffer = await c.req.arrayBuffer();
            const data = Buffer.from(arrayBuffer as ArrayBuffer) as Buffer;
            const etag = await uploadPart(bucketName, key, uploadId, parseInt(partNumber), data);

            return c.text('', 200, { 'ETag': etag });
        } catch (error: any) {
            console.error('Upload Part error:', error);
            return c.text(buildErrorResponse('InternalError', error.message, key, uuidv4()), 500, { 'Content-Type': 'application/xml' });
        }
    }

    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, bucketName));

    if (!bucket) {
        return c.text(buildErrorResponse('NoSuchBucket', 'The specified bucket does not exist', bucketName, uuidv4()), 404, { 'Content-Type': 'application/xml' });
    }

    // Check for Pre-Signed URL Signature
    const signature = c.req.query('signature');
    const expires = c.req.query('expires');
    const operation = c.req.query('operation');

    if (signature && expires) {
        if (!bucket.secretKey) {
            return c.text(buildErrorResponse('AccessDenied', 'Bucket does not have a secret key', bucketName, uuidv4()), 403, { 'Content-Type': 'application/xml' });
        }

        const isValid = validatePresignedUrl(
            bucketName,
            key,
            'PUT', // Enforce PUT operation
            signature,
            expires,
            bucket.secretKey
        );

        if (!isValid) {
            return c.text(buildErrorResponse('SignatureDoesNotMatch', 'The request signature we calculated does not match the signature you provided.', bucketName, uuidv4()), 403, { 'Content-Type': 'application/xml' });
        }
    }

    // Check bucket policy for PutObject action
    if (bucket.policy) {
        const resource = `arn:aws:s3:::${bucketName}/${key}`;
        const isAllowed = evaluatePolicy(bucket.policy, {
            bucketName,
            action: 's3:PutObject',
            resource,
            sourceIp: c.req.header('x-forwarded-for') || c.req.header('x-real-ip')
        });

        if (!isAllowed) {
            return c.text(buildErrorResponse('AccessDenied', 'Access Denied by bucket policy', bucketName, uuidv4()), 403, { 'Content-Type': 'application/xml' });
        }
    }

    const arrayBuffer = await c.req.arrayBuffer();
    let data = Buffer.from(arrayBuffer as ArrayBuffer) as Buffer;
    let fileSize = data.length;

    // Handle Encryption
    const sseType = c.req.header('x-amz-server-side-encryption');
    const sseCAlgo = c.req.header('x-amz-server-side-encryption-customer-algorithm');

    let encryptionMetadata: any = null;

    if (sseCAlgo) {
        // SSE-C
        try {
            const encryptionKey = validateSSECHeaders(c.req.header());
            if (encryptionKey) {
                const result = encryptObject(data, encryptionKey);
                data = result.encryptedData;
                fileSize = data.length;
                encryptionMetadata = JSON.stringify({
                    type: 'SSE-C',
                    iv: result.iv,
                    authTag: result.authTag,
                    keyMd5: c.req.header('x-amz-server-side-encryption-customer-key-md5')
                });
            }
        } catch (e: any) {
            return c.text(buildErrorResponse('InvalidArgument', e.message, key, uuidv4()), 400, { 'Content-Type': 'application/xml' });
        }
    } else if (sseType === 'AES256') {
        // SSE-S3
        let bucketKey = bucket.encryptionKeyId;
        if (!bucketKey) {
            bucketKey = generateEncryptionKey();
            await db.update(buckets).set({ encryptionKeyId: bucketKey }).where(eq(buckets.id, bucket.id));
        }

        const result = encryptObject(data, bucketKey);
        data = result.encryptedData;
        fileSize = data.length;
        encryptionMetadata = JSON.stringify({
            type: 'SSE-S3',
            iv: result.iv,
            authTag: result.authTag,
            keyId: 'bucket-key'
        });
    }

    // Smart volume selection: prefer bucket's volume, fallback to least-used
    let volume;
    try {
        // First, try to use the bucket's preferred volume
        const [bucketVolume] = await db.select().from(volumes).where(eq(volumes.id, bucket.volumeId));

        if (bucketVolume) {
            // Check if bucket's volume has enough space
            const available = bucketVolume.capacity - bucketVolume.used;
            if (available >= fileSize) {
                volume = bucketVolume;
            }
        }

        // If bucket's volume doesn't have space, use least-used volume
        if (!volume) {
            volume = await selectVolumeForUpload(fileSize);
        }
    } catch (err: any) {
        return c.text(buildErrorResponse('InsufficientStorage', err.message, key, uuidv4()), 507, { 'Content-Type': 'application/xml' });
    }

    const filePath = path.join(volume.path, bucketName, key);

    // Ensure parent directory exists (for keys with slashes)
    await fs.ensureDir(path.dirname(filePath));

    // Calculate ETag
    const crypto = await import('crypto');
    const etag = crypto.createHash('md5').update(data).digest('hex');

    // Stream file to disk
    await fs.writeFile(filePath, data);

    // Check if object already exists (for updates)
    const [existingLocation] = await db.select()
        .from(objectLocations)
        .where(and(
            eq(objectLocations.bucketId, bucket.id),
            eq(objectLocations.objectKey, key)
        ));

    let locationId: number;

    if (existingLocation) {
        // Update: delete old file and decrement old volume usage
        if (fs.existsSync(existingLocation.filePath)) {
            await fs.unlink(existingLocation.filePath);
        }
        await decrementVolumeUsage(existingLocation.volumeId, existingLocation.size);

        // Update location record
        const [updated] = await db.update(objectLocations)
            .set({
                volumeId: volume.id,
                filePath: filePath,
                size: fileSize,
                etag: etag,
                encryptionMetadata: encryptionMetadata,
            })
            .where(eq(objectLocations.id, existingLocation.id))
            .returning({ id: objectLocations.id });
        locationId = updated.id;
    } else {
        // Insert new location record
        const [inserted] = await db.insert(objectLocations).values({
            bucketId: bucket.id,
            objectKey: key,
            volumeId: volume.id,
            filePath: filePath,
            size: fileSize,
            etag: etag,
            encryptionMetadata: encryptionMetadata,
        }).returning({ id: objectLocations.id });
        locationId = inserted.id;
    }

    // Update volume usage
    await incrementVolumeUsage(volume.id, fileSize);

    // Create version if versioning is enabled
    let versionId: string | undefined;
    if (bucket.versioningEnabled) {
        versionId = await createVersion(bucket.id, key, locationId, true, false, fileSize, etag);
    }

    // Emit Event
    emitEvent(bucket.id, 's3:ObjectCreated:Put', {
        bucketName,
        objectKey: key,
        size: fileSize,
        etag: etag,
        versionId: versionId
    }).catch(console.error);

    const responseHeaders: Record<string, string> = {
        'ETag': `"${etag}"`,
    };

    if (versionId) {
        responseHeaders['x-amz-version-id'] = versionId;
    }

    return c.text('', 200, responseHeaders);
});

// Head Object - Get object metadata without downloading
s3Routes.on('HEAD', '/:bucket/:key{.+}', async (c) => {
    const bucketName = c.req.param('bucket');
    const key = c.req.param('key');

    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, bucketName));

    if (!bucket) {
        return c.text('', 404, { 'x-amz-error-code': 'NoSuchBucket' });
    }

    // Find object location
    const [location] = await db.select()
        .from(objectLocations)
        .where(and(
            eq(objectLocations.bucketId, bucket.id),
            eq(objectLocations.objectKey, key)
        ));

    if (!location) {
        return c.text('', 404, { 'x-amz-error-code': 'NoSuchKey' });
    }

    if (!fs.existsSync(location.filePath)) {
        return c.text('', 404, { 'x-amz-error-code': 'NoSuchKey' });
    }

    // Get file stats
    const stats = await fs.stat(location.filePath);

    // Build response headers
    const headers: Record<string, string> = {
        'Content-Length': stats.size.toString(),
        'Content-Type': location.contentType || 'application/octet-stream',
        'Last-Modified': (location.createdAt || stats.mtime).toUTCString(),
        'ETag': location.etag || `"${uuidv4()}"`,
        'Accept-Ranges': 'bytes',
    };

    // Add version ID if available
    if (location.versionId) {
        headers['x-amz-version-id'] = location.versionId;
    }

    // Add custom metadata if available
    if (location.metadata) {
        try {
            const metadata = JSON.parse(location.metadata);
            Object.keys(metadata).forEach(key => {
                headers[`x-amz-meta-${key}`] = metadata[key];
            });
        } catch (e) {
            // Ignore invalid metadata JSON
        }
    }

    // Add encryption metadata if available
    // Add encryption metadata if available
    if (location.encryptionMetadata) {
        try {
            const encMeta = JSON.parse(location.encryptionMetadata);
            if (encMeta.type === 'SSE-S3') {
                headers['x-amz-server-side-encryption'] = 'AES256';
            } else if (encMeta.type === 'SSE-C') {
                headers['x-amz-server-side-encryption-customer-algorithm'] = 'AES256';
                if (encMeta.keyMd5) {
                    headers['x-amz-server-side-encryption-customer-key-md5'] = encMeta.keyMd5;
                }
            }
        } catch (e) {
            // Ignore invalid encryption metadata JSON
        }
    }

    return c.text('', 200, headers);
});

// Get Object
s3Routes.get('/:bucket/:key{.+}', async (c) => {
    const bucketName = c.req.param('bucket');
    const key = c.req.param('key');

    // Check for pre-signed URL parameters
    const signature = c.req.query('signature');
    const expires = c.req.query('expires');
    const operation = c.req.query('operation');
    const uploadId = c.req.query('uploadId');
    const versionId = c.req.query('versionId');

    if (uploadId) {
        try {
            const parts = await listParts(bucketName, key, uploadId);

            let partsXml = '';
            parts.forEach(part => {
                partsXml += `<Part>
  <PartNumber>${part.partNumber}</PartNumber>
  <LastModified>${part.uploadedAt?.toISOString()}</LastModified>
  <ETag>${part.etag}</ETag>
  <Size>${part.size}</Size>
</Part>`;
            });

            const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ListPartsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Bucket>${bucketName}</Bucket>
  <Key>${key}</Key>
  <UploadId>${uploadId}</UploadId>
  <StorageClass>STANDARD</StorageClass>
  <PartNumberMarker>0</PartNumberMarker>
  <NextPartNumberMarker>${parts.length > 0 ? parts[parts.length - 1].partNumber : 0}</NextPartNumberMarker>
  <MaxParts>1000</MaxParts>
  <IsTruncated>false</IsTruncated>
  ${partsXml}
</ListPartsResult>`;

            return c.text(xml, 200, { 'Content-Type': 'application/xml' });
        } catch (error: any) {
            console.error('List Parts error:', error);
            return c.text(buildErrorResponse('InternalError', error.message, key, uuidv4()), 500, { 'Content-Type': 'application/xml' });
        }
    }

    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, bucketName));

    if (!bucket) {
        return c.text(buildErrorResponse('NoSuchBucket', 'The specified bucket does not exist', bucketName, uuidv4()), 404, { 'Content-Type': 'application/xml' });
    }

    // Validate pre-signed URL if parameters are present
    if (signature && expires && operation) {
        if (!bucket.secretKey) {
            return c.text(buildErrorResponse('AccessDenied', 'Bucket does not support pre-signed URLs', key, uuidv4()), 403, { 'Content-Type': 'application/xml' });
        }

        const isValid = validatePresignedUrl(bucketName, key, operation, signature, expires, bucket.secretKey);

        if (!isValid) {
            return c.text(buildErrorResponse('AccessDenied', 'Invalid or expired pre-signed URL', key, uuidv4()), 403, { 'Content-Type': 'application/xml' });
        }

        if (operation !== 'GET') {
            return c.text(buildErrorResponse('MethodNotAllowed', 'Pre-signed URL operation mismatch', key, uuidv4()), 405, { 'Content-Type': 'application/xml' });
        }
    }

    // Find object location
    let location;

    if (versionId) {
        // Get specific version
        const version = await getVersion(bucket.id, key, versionId);
        if (!version || !version.location) {
            return c.text(buildErrorResponse('NoSuchVersion', 'The specified version does not exist', key, uuidv4()), 404, { 'Content-Type': 'application/xml' });
        }
        location = version.location;
    } else {
        // Get latest version
        const [latestLocation] = await db.select()
            .from(objectLocations)
            .where(and(
                eq(objectLocations.bucketId, bucket.id),
                eq(objectLocations.objectKey, key)
            ));
        location = latestLocation;
    }

    if (!location) {
        return c.text(buildErrorResponse('NoSuchKey', 'The specified key does not exist', key, uuidv4()), 404, { 'Content-Type': 'application/xml' });
    }

    if (!fs.existsSync(location.filePath)) {
        return c.text(buildErrorResponse('NoSuchKey', 'The specified key does not exist', key, uuidv4()), 404, { 'Content-Type': 'application/xml' });
    }

    let fileContent: Buffer = await fs.readFile(location.filePath);

    // Handle Decryption
    if (location.encryptionMetadata) {
        try {
            const encMeta = JSON.parse(location.encryptionMetadata);

            if (encMeta.type === 'SSE-C') {
                // Validate headers
                const encryptionKey = validateSSECHeaders(c.req.header());
                if (!encryptionKey) {
                    return c.text(buildErrorResponse('InvalidRequest', 'The object was stored using a form of Server Side Encryption. The correct parameters must be provided to retrieve the object.', key, uuidv4()), 400, { 'Content-Type': 'application/xml' });
                }

                // Verify key MD5 if stored
                if (encMeta.keyMd5 && c.req.header('x-amz-server-side-encryption-customer-key-md5') !== encMeta.keyMd5) {
                    return c.text(buildErrorResponse('PreconditionFailed', 'The provided encryption key does not match the one used to encrypt the object', key, uuidv4()), 412, { 'Content-Type': 'application/xml' });
                }

                fileContent = decryptObject(fileContent, encryptionKey, encMeta.iv, encMeta.authTag);
            } else if (encMeta.type === 'SSE-S3') {
                // Get bucket key
                const [bucket] = await db.select().from(buckets).where(eq(buckets.id, location.bucketId));
                if (!bucket || !bucket.encryptionKeyId) {
                    throw new Error('Bucket encryption key not found');
                }
                fileContent = decryptObject(fileContent, bucket.encryptionKeyId, encMeta.iv, encMeta.authTag);
            }
        } catch (e: any) {
            console.error('Decryption error:', e);
            return c.text(buildErrorResponse('InternalError', 'Failed to decrypt object', key, uuidv4()), 500, { 'Content-Type': 'application/xml' });
        }
    }

    // @ts-ignore: Hono supports stream response but types might be tricky
    return c.body(fileContent);
});

// Delete Object
s3Routes.delete('/:bucket/:key{.+}', async (c) => {
    const bucketName = c.req.param('bucket');
    const key = c.req.param('key');
    const uploadId = c.req.query('uploadId');
    const versionId = c.req.query('versionId');

    if (uploadId) {
        try {
            await abortMultipartUpload(bucketName, key, uploadId);
            return c.body(null, 204);
        } catch (error: any) {
            console.error('Abort Multipart error:', error);
            return c.text(buildErrorResponse('InternalError', error.message, key, uuidv4()), 500, { 'Content-Type': 'application/xml' });
        }
    }

    const [bucket] = await db.select().from(buckets).where(eq(buckets.name, bucketName));

    if (!bucket) {
        return c.text(buildErrorResponse('NoSuchBucket', 'The specified bucket does not exist', bucketName, uuidv4()), 404, { 'Content-Type': 'application/xml' });
    }

    // Find object location
    const [location] = await db.select()
        .from(objectLocations)
        .where(and(
            eq(objectLocations.bucketId, bucket.id),
            eq(objectLocations.objectKey, key)
        ));

    if (!location) {
        return c.text(buildErrorResponse('NoSuchKey', 'The specified key does not exist', key, uuidv4()), 404, { 'Content-Type': 'application/xml' });
    }

    // Handle versioning
    if (bucket.versioningEnabled && !versionId) {
        // Create delete marker instead of actually deleting
        const deleteMarkerId = await createDeleteMarker(bucket.id, key);

        // Emit Event
        emitEvent(bucket.id, 's3:ObjectRemoved:DeleteMarkerCreated', {
            bucketName,
            objectKey: key,
            size: 0,
            etag: '',
            versionId: deleteMarkerId
        }).catch(console.error);

        return c.body(null, 204, {
            'x-amz-version-id': deleteMarkerId,
            'x-amz-delete-marker': 'true'
        });
    }

    // If versionId is provided, delete that specific version
    if (versionId) {
        const [volume] = await db.select().from(volumes).where(eq(volumes.id, location.volumeId));
        if (!volume) {
            return c.text(buildErrorResponse('InternalError', 'Volume not found', key, uuidv4()), 500, { 'Content-Type': 'application/xml' });
        }

        try {
            await deleteVersion(bucket.id, key, versionId, volume.path, volume.id);

            // Emit Event
            emitEvent(bucket.id, 's3:ObjectRemoved:Delete', {
                bucketName,
                objectKey: key,
                size: 0,
                etag: '',
                versionId: versionId
            }).catch(console.error);

            return c.body(null, 204);
        } catch (error: any) {
            console.error('Delete version error:', error);
            return c.text(buildErrorResponse('InternalError', error.message, key, uuidv4()), 500, { 'Content-Type': 'application/xml' });
        }
    }

    // Normal delete (versioning disabled)
    // Check if it's a directory
    if (fs.existsSync(location.filePath)) {
        const stats = await fs.stat(location.filePath);
        if (stats.isDirectory()) {
            // Only delete if empty
            const files = await fs.readdir(location.filePath);
            if (files.length > 0) {
                return c.text(buildErrorResponse('PreconditionFailed', 'Directory is not empty', key, uuidv4()), 412, { 'Content-Type': 'application/xml' });
            }
            await fs.rmdir(location.filePath);
        } else {
            await fs.unlink(location.filePath);
        }
    }

    // Update volume usage
    await decrementVolumeUsage(location.volumeId, location.size);

    // Remove location record
    await db.delete(objectLocations)
        .where(eq(objectLocations.id, location.id));

    // Emit Event
    emitEvent(bucket.id, 's3:ObjectRemoved:Delete', {
        bucketName,
        objectKey: key,
        size: location.size,
        etag: location.etag || '',
        versionId: undefined
    }).catch(console.error);

    return c.body(null, 204);
});

export default s3Routes;
