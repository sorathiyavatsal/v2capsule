CREATE TABLE IF NOT EXISTS "object_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"bucket_id" integer NOT NULL,
	"object_key" text NOT NULL,
	"volume_id" integer NOT NULL,
	"file_path" text NOT NULL,
	"size" bigint NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "volumes" ADD COLUMN "capacity" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "volumes" ADD COLUMN "used" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_object_locations_bucket_key" ON "object_locations" ("bucket_id","object_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_object_locations_volume" ON "object_locations" ("volume_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "object_locations" ADD CONSTRAINT "object_locations_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "buckets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "object_locations" ADD CONSTRAINT "object_locations_volume_id_volumes_id_fk" FOREIGN KEY ("volume_id") REFERENCES "volumes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
