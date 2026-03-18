import { db } from '../db';
import { env } from '../config/env';
import { ensureStorageFolders, migrateLocalFileToS3 } from '../storage/fileStorage';

interface StorageRow {
  id: number;
  storage_path: string;
}

const migrateTable = async (input: {
  column: string;
  rows: StorageRow[];
  table: 'job_outputs' | 'jobs' | 'model_images';
}): Promise<number> => {
  const updatedPaths = new Map<string, string>();
  const updateStatement = db.prepare(`UPDATE ${input.table} SET ${input.column} = ? WHERE id = ?`);
  let updatedRows = 0;

  for (const row of input.rows) {
    const nextPath =
      updatedPaths.get(row.storage_path) ??
      (await migrateLocalFileToS3(row.storage_path).then((storagePath) => {
        updatedPaths.set(row.storage_path, storagePath);
        return storagePath;
      }));

    if (nextPath === row.storage_path) {
      continue;
    }

    updateStatement.run(nextPath, row.id);
    updatedRows += 1;
  }

  return updatedRows;
};

const run = async () => {
  if (env.storageDriver !== 's3') {
    throw new Error('La migración a S3 requiere STORAGE_DRIVER=s3 en el entorno.');
  }

  ensureStorageFolders();

  const modelImageRows = db
    .prepare("SELECT id, file_path AS storage_path FROM model_images WHERE file_path LIKE '/uploads/%'")
    .all() as StorageRow[];
  const garmentRows = db
    .prepare("SELECT id, garment_file_path AS storage_path FROM jobs WHERE garment_file_path LIKE '/uploads/%'")
    .all() as StorageRow[];
  const outputRows = db
    .prepare("SELECT id, result_image AS storage_path FROM job_outputs WHERE result_image LIKE '/uploads/%'")
    .all() as StorageRow[];

  const updatedModelImages = await migrateTable({
    table: 'model_images',
    column: 'file_path',
    rows: modelImageRows,
  });
  const updatedGarments = await migrateTable({
    table: 'jobs',
    column: 'garment_file_path',
    rows: garmentRows,
  });
  const updatedOutputs = await migrateTable({
    table: 'job_outputs',
    column: 'result_image',
    rows: outputRows,
  });

  console.log('[storage] Migracion a S3 completada');
  console.log(`[storage] model_images actualizadas: ${updatedModelImages}`);
  console.log(`[storage] garments en jobs actualizados: ${updatedGarments}`);
  console.log(`[storage] job_outputs actualizados: ${updatedOutputs}`);
};

void run().catch((error) => {
  console.error('[storage] Error migrando archivos a S3:', error);
  process.exit(1);
});
