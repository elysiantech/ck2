-- ChatKit Lite - Required database schema
-- Run this in your Postgres database

CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT DEFAULT 'active',
  title TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS threads_user_id_created_at ON threads(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS thread_items (
  thread_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_id, item_id)
);

CREATE INDEX IF NOT EXISTS thread_items_thread_created ON thread_items(thread_id, created_at);
