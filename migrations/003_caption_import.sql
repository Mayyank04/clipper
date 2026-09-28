-- ==============================================================================
-- 003_caption_import.sql: Caption Presets, Fonts, Sources and Importer Engine
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
  status VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
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
