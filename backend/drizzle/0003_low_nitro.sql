CREATE TABLE IF NOT EXISTS "multipart_uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"upload_id" text NOT NULL,
	"bucket_id" integer,
	"object_key" text NOT NULL,
	"initiated_at" timestamp DEFAULT now(),
	"metadata" text,
	"encryption_config" text,
	CONSTRAINT "multipart_uploads_upload_id_unique" UNIQUE("upload_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "upload_parts" (
	"id" serial PRIMARY KEY NOT NULL,
	"upload_id" text,
	"part_number" integer NOT NULL,
	"etag" text NOT NULL,
	"size" bigint NOT NULL,
	"file_path" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "buckets" ADD COLUMN "access_key" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "buckets" ADD COLUMN "secret_key" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "buckets" ADD COLUMN "versioning_enabled" boolean DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "buckets" ADD COLUMN "encryption_enabled" boolean DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "buckets" ADD COLUMN "encryption_type" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "buckets" ADD COLUMN "encryption_key_id" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "object_locations" ADD COLUMN "version_id" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "object_locations" ADD COLUMN "is_latest" boolean DEFAULT true;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "object_locations" ADD COLUMN "metadata" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "object_locations" ADD COLUMN "content_type" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "object_locations" ADD COLUMN "etag" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "object_locations" ADD COLUMN "encryption_metadata" text;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_upload_parts_upload_id_part_number" ON "upload_parts" ("upload_id","part_number");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "multipart_uploads" ADD CONSTRAINT "multipart_uploads_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "buckets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "upload_parts" ADD CONSTRAINT "upload_parts_upload_id_multipart_uploads_upload_id_fk" FOREIGN KEY ("upload_id") REFERENCES "multipart_uploads"("upload_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
