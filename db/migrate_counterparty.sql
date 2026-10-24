-- Run this if you already created the database with the old schema.
-- Adds recipient/source fields to transactions. Safe to run multiple times.
--   psql "$DATABASE_URL" -f db/migrate_counterparty.sql

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS counterparty_account VARCHAR(64),
    ADD COLUMN IF NOT EXISTS counterparty_phone   VARCHAR(40);
