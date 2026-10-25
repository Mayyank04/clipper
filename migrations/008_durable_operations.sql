-- ==============================================================================
-- 008_durable_operations.sql: Durable Operations, Leased Attempts, Outbox & Idempotency
-- ==============================================================================

CREATE TABLE IF NOT EXISTS operations (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(32) NOT NULL,
  state VARCHAR(32) NOT NULL DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed', 'cancelled'
  input_revision_id VARCHAR(64) REFERENCES composition_revisions(id) ON DELETE SET NULL,
  idempotency_key VARCHAR(128) UNIQUE,
  progress INT DEFAULT 0,
  stage VARCHAR(32) DEFAULT 'QUEUED',
  message TEXT,
  cancellation_requested BOOLEAN DEFAULT false,
  error_code VARCHAR(64),
  error_message TEXT,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_operations_workspace ON operations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_operations_state ON operations(state);
CREATE INDEX IF NOT EXISTS idx_operations_idempotency ON operations(idempotency_key);

CREATE TABLE IF NOT EXISTS job_attempts (
  id VARCHAR(64) PRIMARY KEY,
  operation_id VARCHAR(64) NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  stage VARCHAR(32) NOT NULL,
  attempt_number INT NOT NULL DEFAULT 1,
  lease_token VARCHAR(64),
  lease_expires_at TIMESTAMP WITH TIME ZONE,
  worker_id VARCHAR(64),
  outcome VARCHAR(32), -- 'success', 'failure', 'cancelled', 'timeout'
  error_code VARCHAR(64),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_attempts_operation ON job_attempts(operation_id);
CREATE INDEX IF NOT EXISTS idx_attempts_lease ON job_attempts(lease_token, lease_expires_at);

CREATE TABLE IF NOT EXISTS operation_outbox (
  id VARCHAR(64) PRIMARY KEY,
  operation_id VARCHAR(64) NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(32) DEFAULT 'pending', -- 'pending', 'published', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_outbox_status ON operation_outbox(status);
