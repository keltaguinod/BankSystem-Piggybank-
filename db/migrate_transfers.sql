-- Upgrades an existing database to the account-to-account transfer model.
-- Safe to run multiple times.
--   In pgAdmin Query Tool, paste and run the whole file.

-- 1. Add account_number to users (nullable first so we can backfill)
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_number VARCHAR(20);

-- 2. Backfill any users without an account number with a unique 10-digit number
UPDATE users
SET account_number = LPAD((1000000000 + id)::text, 10, '0')
WHERE account_number IS NULL;

-- 3. Enforce uniqueness + not null
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_account_number_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_account_number_key UNIQUE (account_number);
  END IF;
END $$;
ALTER TABLE users ALTER COLUMN account_number SET NOT NULL;

-- 4. Transactions: new transfer fields
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS counterparty_id      INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS counterparty_account VARCHAR(20);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS counterparty_name    VARCHAR(120);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS counterparty_email   VARCHAR(160);

-- 5. Drop old columns no longer used
ALTER TABLE transactions DROP COLUMN IF EXISTS description;
ALTER TABLE transactions DROP COLUMN IF EXISTS counterparty_phone;
