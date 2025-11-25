CREATE TABLE IF NOT EXISTS "buckets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"volume_id" serial NOT NULL,
	"owner_id" serial NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "buckets_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"access_key" text NOT NULL,
	"secret_key" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_access_key_unique" UNIQUE("access_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "volumes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"path" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "volumes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "buckets" ADD CONSTRAINT "buckets_volume_id_volumes_id_fk" FOREIGN KEY ("volume_id") REFERENCES "volumes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "buckets" ADD CONSTRAINT "buckets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
