import { pgTable, serial, text, timestamp, boolean, uuid, bigint, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    fullName: text('full_name'),
    role: text('role').notNull().default('user'), // 'superadmin' | 'user'
    accessKey: text('access_key').notNull().unique(),
    secretKey: text('secret_key').notNull(),
    isVerified: boolean('is_verified').default(false),
    verificationToken: text('verification_token'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const volumes = pgTable('volumes', {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    path: text('path').notNull(), // Physical path on the server
    capacity: bigint('capacity', { mode: 'number' }).notNull().default(0), // Total capacity in bytes
    used: bigint('used', { mode: 'number' }).notNull().default(0), // Used space in bytes
    isDefault: boolean('is_default').default(false),
    createdAt: timestamp('created_at').defaultNow(),
});

export const buckets = pgTable('buckets', {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    volumeId: serial('volume_id').references(() => volumes.id), // Primary volume (for backward compatibility)
    ownerId: serial('owner_id').references(() => users.id),
    accessKey: text('access_key'),
    secretKey: text('secret_key'),
    versioningEnabled: boolean('versioning_enabled').default(false),
    encryptionEnabled: boolean('encryption_enabled').default(false),
    encryptionType: text('encryption_type'), // 'SSE-S3' | 'SSE-C'
    encryptionKeyId: text('encryption_key_id'),
    policy: text('policy'), // JSON string for bucket policy
    createdAt: timestamp('created_at').defaultNow(),
});

export const objectLocations = pgTable('object_locations', {
    id: serial('id').primaryKey(),
    bucketId: integer('bucket_id').references(() => buckets.id).notNull(),
    objectKey: text('object_key').notNull(),
    volumeId: integer('volume_id').references(() => volumes.id).notNull(),
    filePath: text('file_path').notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    versionId: text('version_id'),
    isLatest: boolean('is_latest').default(true),
    metadata: text('metadata'), // JSON string for custom metadata
    contentType: text('content_type'),
    etag: text('etag'),
    encryptionMetadata: text('encryption_metadata'), // JSON string for encryption info
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
    bucketKeyIdx: index('idx_object_locations_bucket_key').on(table.bucketId, table.objectKey),
    volumeIdx: index('idx_object_locations_volume').on(table.volumeId),
}));

export const multipartUploads = pgTable('multipart_uploads', {
    id: serial('id').primaryKey(),
    uploadId: text('upload_id').notNull().unique(),
    bucketId: integer('bucket_id').references(() => buckets.id),
    objectKey: text('object_key').notNull(),
    initiatedAt: timestamp('initiated_at').defaultNow(),
    metadata: text('metadata'), // JSON string
    encryptionConfig: text('encryption_config'), // JSON string
});

export const uploadParts = pgTable('upload_parts', {
    id: serial('id').primaryKey(),
    uploadId: text('upload_id').references(() => multipartUploads.uploadId),
    partNumber: integer('part_number').notNull(),
    etag: text('etag').notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    filePath: text('file_path').notNull(),
    uploadedAt: timestamp('uploaded_at').defaultNow(),
}, (table) => ({
    uploadPartIdx: index('idx_upload_parts_upload_id_part_number').on(table.uploadId, table.partNumber),
}));

export const bucketPolicies = pgTable('bucket_policies', {
    id: serial('id').primaryKey(),
    bucketId: integer('bucket_id').references(() => buckets.id).unique().notNull(),
    policy: text('policy').notNull(), // JSON string
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const bucketCors = pgTable('bucket_cors', {
    id: serial('id').primaryKey(),
    bucketId: integer('bucket_id').references(() => buckets.id).unique().notNull(),
    corsRules: text('cors_rules').notNull(), // JSON string
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const objectVersions = pgTable('object_versions', {
    id: serial('id').primaryKey(),
    bucketId: integer('bucket_id').references(() => buckets.id).notNull(),
    key: text('key').notNull(),
    versionId: text('version_id').notNull().unique(),
    locationId: integer('location_id').references(() => objectLocations.id),
    isLatest: boolean('is_latest').default(false).notNull(),
    isDeleteMarker: boolean('is_delete_marker').default(false).notNull(),
    size: bigint('size', { mode: 'number' }),
    etag: text('etag'),
    createdAt: timestamp('created_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
}, (table) => ({
    bucketKeyIdx: index('bucket_key_idx').on(table.bucketId, table.key),
    versionIdIdx: index('version_id_idx').on(table.versionId),
    isLatestIdx: index('is_latest_idx').on(table.isLatest),
}));

export const eventNotifications = pgTable('event_notifications', {
    id: serial('id').primaryKey(),
    bucketId: integer('bucket_id').references(() => buckets.id).notNull(),
    eventType: text('event_type').notNull(), // 's3:ObjectCreated:*', 's3:ObjectRemoved:*', etc.
    webhookUrl: text('webhook_url').notNull(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
});

// Relations

export const bucketsRelations = relations(buckets, ({ one, many }) => ({
    volume: one(volumes, {
        fields: [buckets.volumeId],
        references: [volumes.id],
    }),
    owner: one(users, {
        fields: [buckets.ownerId],
        references: [users.id],
    }),
    objects: many(objectLocations),
    multipartUploads: many(multipartUploads),
    eventNotifications: many(eventNotifications),
}));

export const multipartUploadsRelations = relations(multipartUploads, ({ one, many }) => ({
    bucket: one(buckets, {
        fields: [multipartUploads.bucketId],
        references: [buckets.id],
    }),
    parts: many(uploadParts),
}));

export const uploadPartsRelations = relations(uploadParts, ({ one }) => ({
    upload: one(multipartUploads, {
        fields: [uploadParts.uploadId],
        references: [multipartUploads.uploadId],
        relationName: 'upload_parts_upload'
    }),
}));

export const objectLocationsRelations = relations(objectLocations, ({ one }) => ({
    bucket: one(buckets, {
        fields: [objectLocations.bucketId],
        references: [buckets.id],
    }),
    volume: one(volumes, {
        fields: [objectLocations.volumeId],
        references: [volumes.id],
    }),
}));

export const volumesRelations = relations(volumes, ({ many }) => ({
    buckets: many(buckets),
}));

export const eventNotificationsRelations = relations(eventNotifications, ({ one }) => ({
    bucket: one(buckets, {
        fields: [eventNotifications.bucketId],
        references: [buckets.id],
    }),
}));
