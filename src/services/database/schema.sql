-- ==============================================================================
-- VIRALCLIP STUDIO — CANONICAL POSTGRESQL SCHEMA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  plan VARCHAR(32) DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  original_filename VARCHAR(255) NOT NULL,
  stored_key VARCHAR(512) NOT NULL,
  public_url VARCHAR(1024),
  mime_type VARCHAR(64) NOT NULL,
  file_size_bytes BIGINT DEFAULT 0,
  duration NUMERIC(10, 3) DEFAULT 0,
  width INT DEFAULT 0,
  height INT DEFAULT 0,
  fps NUMERIC(6, 2) DEFAULT 0,
  has_audio BOOLEAN DEFAULT true,
  has_video BOOLEAN DEFAULT true,
  video_codec VARCHAR(32),
  audio_codec VARCHAR(32),
  sample_rate INT DEFAULT 48000,
  channels INT DEFAULT 2,
  status VARCHAR(32) DEFAULT 'PROCESSING',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_user_id ON media(user_id);
CREATE INDEX IF NOT EXISTS idx_media_stored_key ON media(stored_key);

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  source_media_id VARCHAR(64) REFERENCES media(id) ON DELETE SET NULL,
  original_url VARCHAR(1024),
  duration NUMERIC(10, 3) DEFAULT 0,
  width INT DEFAULT 1080,
  height INT DEFAULT 1920,
  fps NUMERIC(6, 2) DEFAULT 30.00,
  aspect_ratio VARCHAR(16) DEFAULT '9:16',
  status VARCHAR(32) DEFAULT 'READY',
  project_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

CREATE TABLE IF NOT EXISTS transcripts (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
  media_id VARCHAR(64) REFERENCES media(id) ON DELETE SET NULL,
  full_text TEXT NOT NULL,
  language VARCHAR(16) DEFAULT 'en',
  duration NUMERIC(10, 3) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transcripts_project_id ON transcripts(project_id);

CREATE TABLE IF NOT EXISTS transcript_words (
  id VARCHAR(64) PRIMARY KEY,
  transcript_id VARCHAR(64) REFERENCES transcripts(id) ON DELETE CASCADE,
  word VARCHAR(255) NOT NULL,
  start_time NUMERIC(10, 3) NOT NULL,
  end_time NUMERIC(10, 3) NOT NULL,
  confidence NUMERIC(4, 3) DEFAULT 1.0,
  sequence_order INT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transcript_words_timing ON transcript_words(transcript_id, start_time, sequence_order);

CREATE TABLE IF NOT EXISTS captions (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
  short_id VARCHAR(64),
  style_id VARCHAR(64) NOT NULL,
  customization JSONB NOT NULL DEFAULT '{}'::jsonb,
  segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_captions_project ON captions(project_id, short_id);

CREATE TABLE IF NOT EXISTS render_plans (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
  short_id VARCHAR(64),
  plan_json JSONB NOT NULL,
  hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_render_plans_project ON render_plans(project_id, short_id);

CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
  media_id VARCHAR(64) REFERENCES media(id) ON DELETE SET NULL,
  type VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
  progress INT DEFAULT 0,
  stage VARCHAR(64) DEFAULT 'QUEUED',
  message TEXT,
  error_code VARCHAR(64),
  error_message TEXT,
  worker_id VARCHAR(64),
  payload JSONB DEFAULT '{}'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_project_id ON jobs(project_id);

CREATE TABLE IF NOT EXISTS exports (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
  short_id VARCHAR(64),
  job_id VARCHAR(64) REFERENCES jobs(id) ON DELETE SET NULL,
  object_key VARCHAR(512) NOT NULL,
  public_url VARCHAR(1024),
  file_size BIGINT DEFAULT 0,
  duration NUMERIC(10, 3) DEFAULT 0,
  resolution VARCHAR(32) DEFAULT '1080x1920',
  fps NUMERIC(6, 2) DEFAULT 30.00,
  status VARCHAR(32) DEFAULT 'COMPLETED',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exports_project ON exports(project_id);

CREATE TABLE IF NOT EXISTS assets (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(32) NOT NULL,
  stored_key VARCHAR(512) NOT NULL,
  public_url VARCHAR(1024),
  duration NUMERIC(10, 3) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
