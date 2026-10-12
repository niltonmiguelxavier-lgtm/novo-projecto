-- Esquema inicial PostgreSQL. Rever e aplicar apenas numa base de desenvolvimento.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS app_users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), auth_subject text UNIQUE,
 email text NOT NULL, full_name text NOT NULL,
 role text NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','merchant','admin')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('active','suspended','pending')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_unique ON app_users(lower(email));
CREATE TABLE IF NOT EXISTS merchants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL REFERENCES app_users(id),
 legal_name text NOT NULL, trade_name text, country char(2) NOT NULL DEFAULT 'MZ', currency char(3) NOT NULL DEFAULT 'MZN',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','suspended','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS merchants_owner_idx ON merchants(owner_user_id);
CREATE TABLE IF NOT EXISTS payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), merchant_id uuid NOT NULL REFERENCES merchants(id),
 amount_minor bigint NOT NULL CHECK(amount_minor > 0), currency char(3) NOT NULL DEFAULT 'MZN',
 status text NOT NULL DEFAULT 'created' CHECK(status IN ('created','pending','succeeded','failed','cancelled','refunded')),
 mode text NOT NULL DEFAULT 'sandbox' CHECK(mode IN ('sandbox','live')), idempotency_key text NOT NULL,
 provider text, provider_reference text, description text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(merchant_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS payments_merchant_created_idx ON payments(merchant_id,created_at DESC);
CREATE INDEX IF NOT EXISTS payments_status_created_idx ON payments(status,created_at DESC);
CREATE TABLE IF NOT EXISTS wallets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), merchant_id uuid NOT NULL UNIQUE REFERENCES merchants(id),
 currency char(3) NOT NULL DEFAULT 'MZN', status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','suspended')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ledger_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), wallet_id uuid NOT NULL REFERENCES wallets(id), transaction_id uuid,
 entry_type text NOT NULL CHECK(entry_type IN ('credit','debit')), amount_minor bigint NOT NULL CHECK(amount_minor > 0),
 currency char(3) NOT NULL DEFAULT 'MZN', reference_type text NOT NULL, reference_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ledger_wallet_created_idx ON ledger_entries(wallet_id,created_at DESC);
CREATE TABLE IF NOT EXISTS api_keys (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), merchant_id uuid NOT NULL REFERENCES merchants(id), label text NOT NULL,
 key_prefix text NOT NULL, secret_hash text NOT NULL, environment text NOT NULL DEFAULT 'sandbox' CHECK(environment IN ('sandbox','live')),
 last_used_at timestamptz, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_keys_merchant_idx ON api_keys(merchant_id);
CREATE TABLE IF NOT EXISTS audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid REFERENCES app_users(id), merchant_id uuid REFERENCES merchants(id),
 action text NOT NULL, entity_type text NOT NULL, entity_id text, request_id text, data jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_merchant_created_idx ON audit_logs(merchant_id,created_at DESC);
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit_logs are append-only'; END; $$;
DROP TRIGGER IF EXISTS audit_logs_no_update_delete ON audit_logs;
CREATE TRIGGER audit_logs_no_update_delete BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
COMMIT;
