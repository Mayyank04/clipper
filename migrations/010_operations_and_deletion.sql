-- ==============================================================================
-- 010_operations_and_deletion.sql: Audit Trail, Deletion Requests & Reconciliation Indexes
-- ==============================================================================

CREATE TABLE IF NOT EXISTS audit_events (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64),
  action VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id VARCHAR(64) NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_workspace ON audit_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at DESC);

CREATE TABLE IF NOT EXISTS deletion_requests (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  requested_by VARCHAR(64),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_deletions_status ON deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletions_workspace ON deletion_requests(workspace_id);
