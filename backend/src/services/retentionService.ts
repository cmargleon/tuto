import { db } from '../db';
import { env } from '../config/env';
import { deleteStoredFile } from '../storage/fileStorage';
import { logger } from '../utils/logger';

const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const runRetentionCleanup = async (): Promise<void> => {
  const cutoff = new Date(Date.now() - env.dataRetentionDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);

  const outputPaths = db
    .prepare(
      `SELECT jo.result_image
       FROM job_outputs jo
       INNER JOIN jobs j ON j.id = jo.job_id
       WHERE j.status = 'completed' AND j.created_at <= ?`,
    )
    .all(cutoff) as { result_image: string }[];

  if (outputPaths.length === 0) {
    return;
  }

  const result = db
    .prepare(`DELETE FROM jobs WHERE status = 'completed' AND created_at <= ?`)
    .run(cutoff);

  await Promise.allSettled(outputPaths.map(({ result_image }) => deleteStoredFile(result_image)));

  logger.info(
    { deletedJobs: result.changes, deletedFiles: outputPaths.length, retentionDays: env.dataRetentionDays },
    'retention: limpieza completada',
  );
};

export const startRetentionSchedule = (): void => {
  setInterval(() => {
    void runRetentionCleanup();
  }, RETENTION_INTERVAL_MS);
};
