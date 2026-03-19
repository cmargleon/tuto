import type Database from 'better-sqlite3';

const hasColumn = (db: Database.Database, tableName: string, columnName: string): boolean => {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === columnName);
};

export const runMigrations = (db: Database.Database): void => {
  if (!hasColumn(db, 'jobs', 'queue_priority')) {
    db.exec("ALTER TABLE jobs ADD COLUMN queue_priority INTEGER NOT NULL DEFAULT 0");
  }

  if (!hasColumn(db, 'jobs', 'started_at')) {
    db.exec("ALTER TABLE jobs ADD COLUMN started_at TEXT");
  }

  if (!hasColumn(db, 'jobs', 'retry_count')) {
    db.exec("ALTER TABLE jobs ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0");
  }

  if (!hasColumn(db, 'jobs', 'completed_at')) {
    db.exec("ALTER TABLE jobs ADD COLUMN completed_at TEXT");
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_models_client_id ON models(client_id);
    CREATE INDEX IF NOT EXISTS idx_model_images_model_id_created ON model_images(model_id, created_at, id);
    CREATE INDEX IF NOT EXISTS idx_jobs_batch_id ON jobs(batch_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_model_id ON jobs(model_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_status_priority_created ON jobs(status, queue_priority DESC, created_at ASC, id ASC);
    CREATE INDEX IF NOT EXISTS idx_jobs_processing_started ON jobs(status, started_at);
    CREATE INDEX IF NOT EXISTS idx_jobs_completed_at ON jobs(completed_at);
    CREATE INDEX IF NOT EXISTS idx_job_outputs_job_id_created ON job_outputs(job_id, created_at, id);
    CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON job_logs(job_id);
  `);
};
