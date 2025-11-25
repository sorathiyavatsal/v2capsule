CREATE TABLE IF NOT EXISTS event_notifications (
  id SERIAL PRIMARY KEY,
  bucket_id INTEGER REFERENCES buckets(id) NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  webhook_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
