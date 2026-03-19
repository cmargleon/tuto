export const schemaSql = `
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS model_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id TEXT NOT NULL,
  client_id INTEGER,
  client_name TEXT NOT NULL,
  model_id INTEGER NOT NULL,
  pose_image_id INTEGER NOT NULL,
  garment_name TEXT NOT NULL,
  garment_file_path TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL DEFAULT '9:16',
  provider TEXT NOT NULL,
  prompt TEXT NOT NULL,
  background_config TEXT NOT NULL DEFAULT '{}',
  model_name TEXT NOT NULL,
  queue_priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  current_output_id INTEGER,
  started_at TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE,
  FOREIGN KEY (pose_image_id) REFERENCES model_images(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS job_outputs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  prompt TEXT NOT NULL,
  result_image TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS job_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  output_id INTEGER,
  provider_response TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_models_client_id ON models(client_id);
CREATE INDEX IF NOT EXISTS idx_model_images_model_id_created ON model_images(model_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_jobs_batch_id ON jobs(batch_id);
CREATE INDEX IF NOT EXISTS idx_jobs_model_id ON jobs(model_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status_priority_created ON jobs(status, queue_priority DESC, created_at ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_job_outputs_job_id_created ON job_outputs(job_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON job_logs(job_id);
`;
