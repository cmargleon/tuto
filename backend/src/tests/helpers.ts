import { db } from '../db';

export interface SeedData {
  clientId: number;
  modelId: number;
  poseImageId: number;
}

export const seedBaseData = (): SeedData => {
  db.exec('DELETE FROM jobs');
  db.exec('DELETE FROM model_images');
  db.exec('DELETE FROM models');
  db.exec('DELETE FROM clients');

  const clientId = Number(
    db.prepare('INSERT INTO clients (name) VALUES (?)').run('Cliente Test').lastInsertRowid,
  );
  const modelId = Number(
    db.prepare('INSERT INTO models (client_id, name) VALUES (?, ?)').run(clientId, 'Modelo Test').lastInsertRowid,
  );
  const poseImageId = Number(
    db
      .prepare('INSERT INTO model_images (model_id, file_path) VALUES (?, ?)')
      .run(modelId, 'models/pose-test.jpg').lastInsertRowid,
  );

  return { clientId, modelId, poseImageId };
};

interface JobOverrides {
  status?: string;
  started_at?: string | null;
  retry_count?: number;
  batch_id?: string;
}

export const insertJob = (seed: SeedData, overrides: JobOverrides = {}): number => {
  const result = db
    .prepare(
      `INSERT INTO jobs
         (batch_id, client_id, client_name, model_id, pose_image_id,
          garment_name, garment_file_path, aspect_ratio, provider, prompt,
          background_config, model_name, status, started_at, retry_count)
       VALUES (?, ?, 'Cliente Test', ?, ?,
               'prenda.jpg', 'garments/prenda.jpg', '9:16', 'fal-seedream', 'test prompt',
               '{}', 'Modelo Test', ?, ?, ?)`,
    )
    .run(
      overrides.batch_id ?? 'batch-test',
      seed.clientId,
      seed.modelId,
      seed.poseImageId,
      overrides.status ?? 'pending',
      overrides.started_at ?? null,
      overrides.retry_count ?? 0,
    );

  return Number(result.lastInsertRowid);
};

export const getJobRow = (jobId: number): Record<string, unknown> =>
  db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as Record<string, unknown>;
