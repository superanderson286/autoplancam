-- Migration: add client_errors table
CREATE TABLE IF NOT EXISTS client_errors (
  id SERIAL PRIMARY KEY,
  message TEXT,
  info JSONB,
  url TEXT,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
