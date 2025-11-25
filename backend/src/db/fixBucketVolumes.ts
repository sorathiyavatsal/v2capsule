import { db } from './index';
import { buckets, objectLocations, volumes } from './schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Fix bucket volume references to match where their objects are actually stored
 */
async function fixBucketVolumeReferences() {
    console.log('Checking bucket-volume consistency...\n');

    // Get all buckets
    const allBuckets = await db.select().from(buckets);

    for (const bucket of allBuckets) {
        console.log(`\nChecking bucket: ${bucket.name} (ID: ${bucket.id})`);
        console.log(`  Current volumeId: ${bucket.volumeId}`);

        // Find where this bucket's objects are actually stored
        const objectVolumes = await db
            .select({
                volumeId: objectLocations.volumeId,
                count: sql<number>`count(*)`,
            })
            .from(objectLocations)
            .where(eq(objectLocations.bucketId, bucket.id))
            .groupBy(objectLocations.volumeId);

        if (objectVolumes.length === 0) {
            console.log(`  ✓ No objects - volume reference is fine`);
            continue;
        }

        console.log(`  Objects distribution:`);
        for (const vol of objectVolumes) {
            console.log(`    Volume ${vol.volumeId}: ${vol.count} objects`);
        }

        // If all objects are on a different volume than the bucket's volumeId
        if (objectVolumes.length === 1 && objectVolumes[0].volumeId !== bucket.volumeId) {
            const correctVolumeId = objectVolumes[0].volumeId;
            console.log(`  ⚠️  Mismatch detected!`);
            console.log(`  → Updating bucket volumeId from ${bucket.volumeId} to ${correctVolumeId}`);

            await db
                .update(buckets)
                .set({ volumeId: correctVolumeId })
                .where(eq(buckets.id, bucket.id));

            console.log(`  ✓ Fixed!`);
        } else if (objectVolumes.length > 1) {
            console.log(`  ℹ️  Objects are distributed across multiple volumes (this is normal with multi-volume support)`);
        } else {
            console.log(`  ✓ Bucket and objects are on the same volume`);
        }
    }

    console.log('\n✅ Consistency check complete!');
    process.exit(0);
}

fixBucketVolumeReferences().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
