-- ==============================================================================
-- 007_composition_revisions.sql: Immutable Composition Revisions & Assets
-- ==============================================================================

CREATE TABLE IF NOT EXISTS composition_revisions (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  clip_id VARCHAR(64) NOT NULL,
  revision_number INT NOT NULL DEFAULT 1,
  parent_revision_id VARCHAR(64),
  schema_version VARCHAR(16) NOT NULL DEFAULT 'v1',
  manifest_json JSONB NOT NULL,
  composition_hash VARCHAR(64) NOT NULL,
  created_by VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, clip_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_revisions_workspace ON composition_revisions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_revisions_clip ON composition_revisions(project_id, clip_id);
CREATE INDEX IF NOT EXISTS idx_revisions_hash ON composition_revisions(composition_hash);

CREATE TABLE IF NOT EXISTS revision_assets (
  id VARCHAR(64) PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  revision_id VARCHAR(64) NOT NULL REFERENCES composition_revisions(id) ON DELETE CASCADE,
  media_id VARCHAR(64) NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL, -- 'source', 'broll', 'sfx', 'music', 'font', 'logo'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_revision_assets_rev ON revision_assets(revision_id);
CREATE INDEX IF NOT EXISTS idx_revision_assets_media ON revision_assets(media_id);
