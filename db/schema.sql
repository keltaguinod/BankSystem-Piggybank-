-- ============================================================
--  BankSystem — PostgreSQL schema
--  Run against your own database:  psql "$DATABASE_URL" -f db/schema.sql
--  Or use the helper:              npm run db:init
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(120)        NOT NULL,
    email           VARCHAR(160) UNIQUE NOT NULL,
    account_number  VARCHAR(20)  UNIQUE NOT NULL,
    phone           VARCHAR(40),
    address         TEXT,
    password_hash   VARCHAR(255)        NOT NULL,
    -- balance is stored in the smallest unit-free decimal; 2dp money
    balance         NUMERIC(14,2)       NOT NULL DEFAULT 0.00,
    currency        VARCHAR(8)          NOT NULL DEFAULT 'USD',
    role            VARCHAR(20)         NOT NULL DEFAULT 'customer'
                    CHECK (role IN ('customer','auditor','admin')),
    status          VARCHAR(20)         NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','locked','disabled')),
    failed_login_attempts INTEGER       NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    session_version INTEGER             NOT NULL DEFAULT 1,
    last_login_at   TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- Safe upgrades for databases created from an earlier draft.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'customer';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_allowed') THEN
        ALTER TABLE users ADD CONSTRAINT users_role_allowed
            CHECK (role IN ('customer','auditor','admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_status_allowed') THEN
        ALTER TABLE users ADD CONSTRAINT users_status_allowed
            CHECK (status IN ('active','locked','disabled'));
    END IF;
END $$;

-- type: 'deposit'  = money SENT to another account (this balance goes down)
--       'withdrawal'= money PULLED from another account (this balance goes up)
CREATE TABLE IF NOT EXISTS transactions (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('deposit','withdrawal')),
    amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    balance_after   NUMERIC(14,2) NOT NULL,
    -- the OTHER party in the transfer
    counterparty_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    counterparty_account VARCHAR(20),
    counterparty_name    VARCHAR(120),
    counterparty_email   VARCHAR(160),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_user_created
    ON transactions (user_id, created_at DESC);

-- Append-only security event trail. Never store passwords, tokens, or full request bodies here.
CREATE TABLE IF NOT EXISTS audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    actor_user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(80) NOT NULL,
    target_type     VARCHAR(40),
    target_id       VARCHAR(80),
    outcome         VARCHAR(20) NOT NULL DEFAULT 'success'
                    CHECK (outcome IN ('success','failure','denied')),
    ip_address      VARCHAR(64),
    user_agent      VARCHAR(500),
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor_created ON audit_logs (actor_user_id, created_at DESC);

-- Login-attempt history used for security monitoring. This is deliberately
-- separate from the general audit trail so authentication cannot depend on it.
CREATE TABLE IF NOT EXISTS login_history (
    id              BIGSERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    login_time      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address      VARCHAR(64),
    user_agent      VARCHAR(500),
    status          VARCHAR(20) NOT NULL
                    CHECK (status IN ('SUCCESS','FAILED','LOCKED'))
);

CREATE INDEX IF NOT EXISTS idx_login_history_time
    ON login_history (login_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_user_time
    ON login_history (user_id, login_time DESC);

-- Prevent ordinary UPDATE/DELETE operations even if an application bug attempts them.
CREATE OR REPLACE FUNCTION audit_logs_immutable()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit logs are append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();

-- keep updated_at fresh on users
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_touch ON users;
CREATE TRIGGER trg_users_touch
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
