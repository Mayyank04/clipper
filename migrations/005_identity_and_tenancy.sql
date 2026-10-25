-- ==============================================================================
-- 005_identity_and_tenancy.sql: Workspaces, Memberships, Multi-Tenant Boundaries
-- ==============================================================================

CREATE TABLE IF NOT EXISTS workspaces (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  owner_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_memberships (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'editor', -- 'owner', 'admin', 'editor', 'viewer'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON workspace_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_workspace_id ON workspace_memberships(workspace_id);

-- Ensure a default workspace exists for legacy and local developer projects
INSERT INTO workspaces (id, name, slug)
VALUES ('ws_default', 'Personal Workspace', 'default')
ON CONFLICT (id) DO NOTHING;

-- Add workspace_id column to core entities with fallback to 'ws_default'
ALTER TABLE projects ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(64) DEFAULT 'ws_default';
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);

ALTER TABLE media ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(64) DEFAULT 'ws_default';
CREATE INDEX IF NOT EXISTS idx_media_workspace_id ON media(workspace_id);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(64) DEFAULT 'ws_default';
CREATE INDEX IF NOT EXISTS idx_jobs_workspace_id ON jobs(workspace_id);

ALTER TABLE exports ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(64) DEFAULT 'ws_default';
CREATE INDEX IF NOT EXISTS idx_exports_workspace_id ON exports(workspace_id);
