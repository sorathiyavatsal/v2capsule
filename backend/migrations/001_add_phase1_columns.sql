-- Migration: Add Phase 1 columns to buckets and object_locations tables
-- Date: 2025-11-23

-- Add new columns to buckets table
ALTER TABLE buckets 
ADD COLUMN IF NOT EXISTS versioning_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS encryption_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS encryption_type TEXT,
ADD COLUMN IF NOT EXISTS encryption_key_id TEXT;

-- Add new columns to object_locations table
ALTER TABLE object_locations
ADD COLUMN IF NOT EXISTS version_id TEXT,
ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS metadata TEXT,
ADD COLUMN IF NOT EXISTS content_type TEXT,
ADD COLUMN IF NOT EXISTS etag TEXT,
ADD COLUMN IF NOT EXISTS encryption_metadata TEXT;

-- Create index on version_id for faster version lookups
CREATE INDEX IF NOT EXISTS idx_object_locations_version ON object_locations(version_id);

-- Create index on bucket_id and is_latest for faster latest version queries
CREATE INDEX IF NOT EXISTS idx_object_locations_bucket_latest ON object_locations(bucket_id, is_latest);
