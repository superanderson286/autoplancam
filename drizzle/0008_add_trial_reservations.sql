-- Migration: add trial_reservations table
CREATE TABLE IF NOT EXISTS trial_reservations (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
