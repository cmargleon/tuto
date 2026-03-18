import { db } from '../db';
import { deleteStoredFile } from '../storage/fileStorage';

const buildInClause = (values: number[]): string => values.map(() => '?').join(', ');

const uniquePaths = (paths: string[]): string[] => Array.from(new Set(paths.filter(Boolean)));

export const listModelIdsForClient = (clientId: number): number[] => {
  const rows = db.prepare('SELECT id FROM models WHERE client_id = ?').all(clientId) as Array<{ id: number }>;
  return rows.map((row) => row.id);
};

export const listStoragePathsForModelIds = (modelIds: number[]): string[] => {
  if (modelIds.length === 0) {
    return [];
  }

  const inClause = buildInClause(modelIds);

  const modelImageRows = db
    .prepare(`SELECT file_path AS storage_path FROM model_images WHERE model_id IN (${inClause})`)
    .all(...modelIds) as Array<{ storage_path: string }>;
  const garmentRows = db
    .prepare(`SELECT garment_file_path AS storage_path FROM jobs WHERE model_id IN (${inClause})`)
    .all(...modelIds) as Array<{ storage_path: string }>;
  const outputRows = db
    .prepare(`
      SELECT job_outputs.result_image AS storage_path
      FROM job_outputs
      INNER JOIN jobs ON jobs.id = job_outputs.job_id
      WHERE jobs.model_id IN (${inClause})
    `)
    .all(...modelIds) as Array<{ storage_path: string }>;

  return uniquePaths([
    ...modelImageRows.map((row) => row.storage_path),
    ...garmentRows.map((row) => row.storage_path),
    ...outputRows.map((row) => row.storage_path),
  ]);
};

export const cleanupStoragePaths = async (storagePaths: string[], context: string): Promise<void> => {
  const uniqueStoragePaths = uniquePaths(storagePaths);

  if (uniqueStoragePaths.length === 0) {
    return;
  }

  const results = await Promise.allSettled(uniqueStoragePaths.map((storagePath) => deleteStoredFile(storagePath)));
  const failures = results.flatMap((result, index) =>
    result.status === 'rejected'
      ? [{ path: uniqueStoragePaths[index], reason: result.reason }]
      : [],
  );

  if (failures.length > 0) {
    console.error(`[storage] Fallo limpiando archivos para ${context}`, failures);
  }
};
