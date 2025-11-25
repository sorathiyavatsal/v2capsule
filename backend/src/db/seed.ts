import { db } from './index';
import { volumes } from './schema';
import fs from 'fs-extra';
import path from 'path';
import { eq } from 'drizzle-orm';
import { getPathCapacity } from '../services/volumeDetection';
import 'dotenv/config';

async function seed() {
    console.log('Seeding database...');

    // Create default volume directory if it doesn't exist
    const defaultVolumePath = path.resolve(process.cwd(), '../data/storage');
    await fs.ensureDir(defaultVolumePath);

    // Check if default volume exists in DB
    const existingVolume = await db.select().from(volumes).where(eq(volumes.isDefault, true));

    if (existingVolume.length === 0) {
        console.log('Creating default volume...');

        // Auto-detect capacity
        let capacity = 0;
        try {
            const capacityInfo = await getPathCapacity(defaultVolumePath);
            capacity = capacityInfo.total;
            console.log(`Detected capacity: ${(capacity / 1024 / 1024 / 1024).toFixed(2)} GB`);
        } catch (err) {
            console.warn('Failed to detect capacity, using 0');
        }

        await db.insert(volumes).values({
            name: 'default',
            path: defaultVolumePath,
            capacity,
            used: 0,
            isDefault: true,
        });
        console.log('Default volume created.');
    } else {
        console.log('Default volume already exists.');
    }

    console.log('Seeding complete.');
    process.exit(0);
}

seed().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
