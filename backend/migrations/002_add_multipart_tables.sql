CREATE TABLE IF NOT EXISTS multipart_uploads (
  id SERIAL PRIMARY KEY,
  upload_id VARCHAR(255) UNIQUE NOT NULL,
  bucket_id INTEGER REFERENCES buckets(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL,
  initiated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  encryption_config JSONB
);

CREATE TABLE IF NOT EXISTS upload_parts (
  id SERIAL PRIMARY KEY,
  upload_id VARCHAR(255) REFERENCES multipart_uploads(upload_id) ON DELETE CASCADE,
  part_number INTEGER NOT NULL,
  etag VARCHAR(255) NOT NULL,
  size BIGINT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(upload_id, part_number)
);
