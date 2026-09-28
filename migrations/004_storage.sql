-- ==============================================================================
-- 004_storage.sql: Object Storage Compatibility Views, Metadata & Hardening
-- ==============================================================================

-- Compatibility view for media_assets mapping to media table (Requirement 7)
CREATE OR REPLACE VIEW media_assets AS
SELECT 
  id,
  user_id,
  original_filename,
  stored_key,
  public_url,
  mime_type,
  file_size_bytes,
  duration,
  width,
  height,
  fps,
  has_audio,
  has_video,
  video_codec,
  audio_codec,
  sample_rate,
  channels,
  status,
  metadata,
  created_at
FROM media;

-- Compatibility view for render_jobs mapping to jobs table (Requirement 7)
CREATE OR REPLACE VIEW render_jobs AS
SELECT
  id,
  project_id,
  media_id,
  type,
  status,
  progress,
  stage,
  message,
  error_code,
  error_message,
  worker_id,
  payload,
  result,
  created_at,
  started_at,
  completed_at
FROM jobs;

-- Additional storage & export indexes
CREATE INDEX IF NOT EXISTS idx_exports_object_key ON exports(object_key);
CREATE INDEX IF NOT EXISTS idx_exports_job_id ON exports(job_id);
CREATE INDEX IF NOT EXISTS idx_media_status ON media(status);
CREATE INDEX IF NOT EXISTS idx_assets_stored_key ON assets(stored_key);
