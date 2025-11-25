import { db } from './index';
import { volumes } from './schema';
import { sql } from 'drizzle-orm';

async function updateVolumeCapacity() {
    console.log('Updating volume capacities...');

    // Set capacity to 1TB (1099511627776 bytes) for all volumes
    // You can adjust this value based on your actual disk space
    const capacityInBytes = 1099511627776; // 1TB

    await db.update(volumes)
        .set({
            capacity: capacityInBytes,
            used: 0 // Reset used to 0 since we're starting fresh
        });

    console.log(`✓ All volumes updated with capacity: ${capacityInBytes} bytes (1TB)`);

    // Display current volumes
    const allVolumes = await db.select().from(volumes);
    console.log('\nCurrent volumes:');
    console.table(allVolumes.map(v => ({
        id: v.id,
        name: v.name,
        path: v.path,
        capacity: `${(v.capacity / 1024 / 1024 / 1024).toFixed(2)} GB`,
        used: `${(v.used / 1024 / 1024 / 1024).toFixed(2)} GB`,
        available: `${((v.capacity - v.used) / 1024 / 1024 / 1024).toFixed(2)} GB`,
    })));

    process.exit(0);
}

updateVolumeCapacity().catch((err) => {
    console.error('Error updating volume capacity:', err);
    process.exit(1);
});
