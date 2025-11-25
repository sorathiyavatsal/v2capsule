CREATE TABLE IF NOT EXISTS "bucket_cors" (
	"id" serial PRIMARY KEY NOT NULL,
	"bucket_id" integer NOT NULL,
	"cors_rules" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "bucket_cors_bucket_id_unique" UNIQUE("bucket_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bucket_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"bucket_id" integer NOT NULL,
	"policy" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "bucket_policies_bucket_id_unique" UNIQUE("bucket_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"bucket_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"webhook_url" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "object_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"bucket_id" integer NOT NULL,
	"key" text NOT NULL,
	"version_id" text NOT NULL,
	"location_id" integer,
	"is_latest" boolean DEFAULT false NOT NULL,
	"is_delete_marker" boolean DEFAULT false NOT NULL,
	"size" bigint,
	"etag" text,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "object_versions_version_id_unique" UNIQUE("version_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bucket_key_idx" ON "object_versions" ("bucket_id","key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "version_id_idx" ON "object_versions" ("version_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "is_latest_idx" ON "object_versions" ("is_latest");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bucket_cors" ADD CONSTRAINT "bucket_cors_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "buckets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bucket_policies" ADD CONSTRAINT "bucket_policies_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "buckets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_notifications" ADD CONSTRAINT "event_notifications_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "buckets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "object_versions" ADD CONSTRAINT "object_versions_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "buckets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "object_versions" ADD CONSTRAINT "object_versions_location_id_object_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "object_locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
