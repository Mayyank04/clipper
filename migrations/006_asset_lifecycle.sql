-- ==============================================================================
-- 006_asset_lifecycle.sql: Asset States, Checksums, Provenance & View Updates
-- ==============================================================================

ALTER TABLE media ADD COLUMN IF NOT EXISTS checksum_sha256 VARCHAR(64);
ALTER TABLE media ADD COLUMN IF NOT EXISTS role VARCHAR(32) DEFAULT 'source';
ALTER TABLE media ADD COLUMN IF NOT EXISTS parent_media_id VARCHAR(64) REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE media ADD COLUMN IF NOT EXISTS storage_state VARCHAR(32) DEFAULT 'ready';

CREATE INDEX IF NOT EXISTS idx_media_checksum ON media(checksum_sha256);
CREATE INDEX IF NOT EXISTS idx_media_role ON media(role);
CREATE INDEX IF NOT EXISTS idx_media_storage_state ON media(storage_state);

-- Rebuild media_assets compatibility view cleanly
CREATE OR REPLACE VIEW media_assets AS
SELECT 
  id,
  user_id,
  workspace_id,
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
  checksum_sha256,
  role,
  parent_media_id,
  storage_state,
  created_at
FROM media;
