-- ==============================================================================
-- 002_processing_jobs.sql: Asynchronous Durable Processing Jobs & Events
-- ==============================================================================

CREATE TABLE IF NOT EXISTS processing_jobs (
  id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(32) NOT NULL, -- TRANSCRIBE, ANALYZE_VIDEO, GENERATE_SHORTS, IMPORT_PRESETS, CONVERT_PRESETS, GENERATE_PREVIEW, GENERATE_BROLL, GENERATE_SFX, GENERATE_VFX, RENDER_VIDEO, GENERATE_THUMBNAIL
  status VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
  progress INT DEFAULT 0,
  stage VARCHAR(64) DEFAULT 'QUEUED',
  input JSONB DEFAULT '{}'::jsonb,
  output JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  source_id VARCHAR(64),
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Ensure retry_count exists if table already existed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'processing_jobs' AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE processing_jobs ADD COLUMN retry_count INT DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_created_at ON processing_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_source_id ON processing_jobs(source_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status_created ON processing_jobs(status, created_at DESC);

CREATE TABLE IF NOT EXISTS processing_job_events (
  id VARCHAR(64) PRIMARY KEY,
  job_id VARCHAR(64) REFERENCES processing_jobs(id) ON DELETE CASCADE,
  event_type VARCHAR(64),
  stage VARCHAR(64) NOT NULL,
  progress INT DEFAULT 0,
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure event_type exists if table already existed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'processing_job_events' AND column_name = 'event_type'
  ) THEN
    ALTER TABLE processing_job_events ADD COLUMN event_type VARCHAR(64);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_processing_job_events_job_id ON processing_job_events(job_id);
CREATE INDEX IF NOT EXISTS idx_processing_job_events_created_at ON processing_job_events(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_processing_job_events_job_created ON processing_job_events(job_id, created_at ASC);
