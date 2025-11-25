import { db } from './index';
import { buckets } from './schema';
import { eq } from 'drizzle-orm';

/**
 * Migrate a bucket to a different volume
 * Usage: npx tsx src/db/migrateBucket.ts <bucketId> <newVolumeId>
 */
async function migrateBucket() {
    const bucketId = parseInt(process.argv[2]);
    const newVolumeId = parseInt(process.argv[3]);

    if (!bucketId || !newVolumeId) {
        console.error('Usage: npx tsx src/db/migrateBucket.ts <bucketId> <newVolumeId>');
        process.exit(1);
    }

    console.log(`Migrating bucket ${bucketId} to volume ${newVolumeId}...`);

    const [bucket] = await db.select().from(buckets).where(eq(buckets.id, bucketId));

    if (!bucket) {
        console.error(`Bucket ${bucketId} not found`);
        process.exit(1);
    }

    console.log(`Current bucket: ${bucket.name} on volume ${bucket.volumeId}`);

    await db.update(buckets)
        .set({ volumeId: newVolumeId })
        .where(eq(buckets.id, bucketId));

    console.log(`✓ Bucket migrated to volume ${newVolumeId}`);
    process.exit(0);
}

migrateBucket().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
