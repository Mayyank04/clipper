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

-- ==============================================================================
-- CAPTION PRESET IMPORTER TABLES (Phase 22)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS caption_preset_sources (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL DEFAULT 'Beginner',
  provider VARCHAR(64) NOT NULL DEFAULT 'google_drive',
  source_url VARCHAR(1024) NOT NULL,
  source_id VARCHAR(128),
  last_scanned_at TIMESTAMP WITH TIME ZONE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(32) DEFAULT 'READY',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_preset_sources_category ON caption_preset_sources(category);

CREATE TABLE IF NOT EXISTS caption_presets (
  id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL DEFAULT 'imported',
  preset_json JSONB NOT NULL,
  preview_url VARCHAR(1024),
  source_id VARCHAR(64) REFERENCES caption_preset_sources(id) ON DELETE SET NULL,
  source_file_id VARCHAR(128),
  source_file VARCHAR(255),
  source_type VARCHAR(64) DEFAULT 'xml',
  source_checksum VARCHAR(128),
  is_3d BOOLEAN DEFAULT false,
  conversion_status VARCHAR(32) DEFAULT 'FULL', -- FULL, PARTIAL, UNSUPPORTED
  conversion_version VARCHAR(32) DEFAULT '1.0',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_caption_presets_category ON caption_presets(category);
CREATE INDEX IF NOT EXISTS idx_caption_presets_checksum ON caption_presets(source_checksum);
CREATE INDEX IF NOT EXISTS idx_caption_presets_source_id ON caption_presets(source_id);

CREATE TABLE IF NOT EXISTS caption_fonts (
  id VARCHAR(128) PRIMARY KEY,
  family VARCHAR(255) NOT NULL,
  file_url VARCHAR(1024) NOT NULL,
  format VARCHAR(32) NOT NULL, -- ttf, otf, woff, woff2
  weight INT DEFAULT 400,
  style VARCHAR(32) DEFAULT 'normal',
  checksum VARCHAR(128) NOT NULL,
  source_id VARCHAR(64) REFERENCES caption_preset_sources(id) ON DELETE SET NULL,
  license_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_caption_fonts_checksum ON caption_fonts(checksum);
CREATE INDEX IF NOT EXISTS idx_caption_fonts_family ON caption_fonts(family);

CREATE TABLE IF NOT EXISTS caption_import_jobs (
  id VARCHAR(64) PRIMARY KEY,
  source_id VARCHAR(64) REFERENCES caption_preset_sources(id) ON DELETE SET NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'QUEUED', -- QUEUED, SCANNING, DOWNLOADING, ANALYZING, CONVERTING, VALIDATING, PREVIEWING, IMPORTING, COMPLETED, CANCELLED, FAILED
  stage VARCHAR(64) DEFAULT 'QUEUED',
  current_file VARCHAR(255),
  total_files INT DEFAULT 0,
  processed_files INT DEFAULT 0,
  success_count INT DEFAULT 0,
  partial_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  unsupported_count INT DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_caption_import_jobs_status ON caption_import_jobs(status);

CREATE TABLE IF NOT EXISTS caption_import_errors (
  id VARCHAR(64) PRIMARY KEY,
  job_id VARCHAR(64) REFERENCES caption_import_jobs(id) ON DELETE CASCADE,
  source_file VARCHAR(255) NOT NULL,
  stage VARCHAR(64) NOT NULL,
  error_code VARCHAR(64) NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  suggested_action TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_caption_import_errors_job_id ON caption_import_errors(job_id);

-- ==============================================================================
-- UNIVERSAL PROCESSING JOBS & EVENTS (Requirement 5)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS processing_jobs (
  id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(32) NOT NULL, -- TRANSCRIBE, IMPORT_PRESETS, CONVERT_PRESETS, GENERATE_PREVIEW, GENERATE_SHORTS, RENDER_VIDEO, GENERATE_BROLL, GENERATE_SFX, GENERATE_VFX
  status VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
  progress INT DEFAULT 0,
  stage VARCHAR(64) DEFAULT 'QUEUED',
  input JSONB DEFAULT '{}'::jsonb,
  output JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  source_id VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_created_at ON processing_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_source_id ON processing_jobs(source_id);

CREATE TABLE IF NOT EXISTS processing_job_events (
  id VARCHAR(64) PRIMARY KEY,
  job_id VARCHAR(64) REFERENCES processing_jobs(id) ON DELETE CASCADE,
  stage VARCHAR(64) NOT NULL,
  progress INT DEFAULT 0,
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_processing_job_events_job_id ON processing_job_events(job_id);
CREATE INDEX IF NOT EXISTS idx_processing_job_events_created_at ON processing_job_events(created_at ASC);

