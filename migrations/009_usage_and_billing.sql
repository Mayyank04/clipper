-- ==============================================================================
-- 009_usage_and_billing.sql: Usage Reservations, Append-Only Ledger & Billing Deduplication
-- ==============================================================================

CREATE TABLE IF NOT EXISTS credit_reservations (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  operation_id VARCHAR(64) REFERENCES operations(id) ON DELETE SET NULL,
  pricing_version VARCHAR(32) NOT NULL DEFAULT 'v1',
  units INT NOT NULL,
  state VARCHAR(32) NOT NULL DEFAULT 'reserved', -- 'reserved', 'settled', 'released'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reservations_workspace ON credit_reservations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_reservations_operation ON credit_reservations(operation_id);

CREATE TABLE IF NOT EXISTS usage_ledger (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  reservation_id VARCHAR(64) REFERENCES credit_reservations(id) ON DELETE SET NULL,
  signed_units INT NOT NULL, -- negative for consumption, positive for refund/top-up
  reason VARCHAR(64) NOT NULL,
  business_event_key VARCHAR(128) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_workspace ON usage_ledger(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_event ON usage_ledger(business_event_key);

CREATE TABLE IF NOT EXISTS billing_customers (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) UNIQUE NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider_customer_id VARCHAR(128),
  subscription_status VARCHAR(32) DEFAULT 'active',
  plan_tier VARCHAR(32) DEFAULT 'free',
  allowance_units INT DEFAULT 60, -- 60 minutes free allowance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
