-- Migration: add anti-abuse columns to trial_requests and index
ALTER TABLE trial_requests
  ADD COLUMN IF NOT EXISTS ip TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT;

-- Index to speed up IP queries by created_at window
CREATE INDEX IF NOT EXISTS idx_trial_requests_ip_created_at ON trial_requests (ip, created_at);

-- Optional index on fingerprint for quick lookups
CREATE INDEX IF NOT EXISTS idx_trial_requests_fingerprint ON trial_requests (fingerprint);
