import { db } from './index';
import { buckets } from './schema';
import { eq, isNull } from 'drizzle-orm';
import crypto from 'crypto';

function generateAccessKey() {
    return 'AKIA' + crypto.randomBytes(8).toString('hex').toUpperCase();
}

function generateSecretKey() {
    return crypto.randomBytes(20).toString('base64');
}

async function migrateBucketKeys() {
    console.log('Starting bucket keys migration...');

    const bucketsToUpdate = await db.select().from(buckets).where(isNull(buckets.accessKey));
    console.log(`Found ${bucketsToUpdate.length} buckets to update.`);

    for (const bucket of bucketsToUpdate) {
        const accessKey = generateAccessKey();
        const secretKey = generateSecretKey();

        await db.update(buckets)
            .set({ accessKey, secretKey })
            .where(eq(buckets.id, bucket.id));

        console.log(`Updated bucket ${bucket.name} with new keys.`);
    }

    console.log('Migration complete.');
    process.exit(0);
}

migrateBucketKeys().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
