import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import 'dotenv/config';
import * as schema from './schema';

const runMigrate = async () => {
    const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/v2capsule';

    // For migrations, we need a max connection of 1
    const migrationClient = postgres(connectionString, { max: 1 });
    const db = drizzle(migrationClient, { schema });

    console.log('Running migrations...');

    await migrate(db, { migrationsFolder: 'drizzle' });

    console.log('Migrations completed!');

    await migrationClient.end();
};

runMigrate().catch((err) => {
    console.error('Migration failed!', err);
    process.exit(1);
});
