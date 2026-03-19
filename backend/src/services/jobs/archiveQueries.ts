import { db } from '../../db';
import { mapArchiveBatch, mapArchiveClient } from './mappers';
import type {
  ArchiveClientSummary,
  DbArchiveBatchRow,
  DbArchiveClientRow,
  PaginatedArchiveBatchResult,
} from './types';

export const listArchiveClients = (): ArchiveClientSummary[] => {
  const rows = db
    .prepare(`
      SELECT
        jobs.client_id,
        jobs.client_name,
        COUNT(DISTINCT jobs.batch_id) AS batch_count,
        MAX(jobs.created_at) AS last_batch_created_at
      FROM jobs
      WHERE jobs.client_id IS NOT NULL
      GROUP BY jobs.client_id, jobs.client_name
      ORDER BY last_batch_created_at DESC, jobs.client_id DESC
    `)
    .all() as DbArchiveClientRow[];

  return rows.map(mapArchiveClient);
};

export const listArchiveBatches = (clientId: number, page: number, pageSize: number): PaginatedArchiveBatchResult => {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, 100));
  const offset = (safePage - 1) * safePageSize;
  const totalRow = db
    .prepare('SELECT COUNT(DISTINCT batch_id) AS total_items FROM jobs WHERE client_id = ?')
    .get(clientId) as { total_items: number } | undefined;
  const totalItems = Number(totalRow?.total_items ?? 0);
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / safePageSize);
  const rows = db
    .prepare(`
      SELECT
        jobs.batch_id,
        jobs.client_id,
        jobs.client_name,
        jobs.model_name,
        MAX(jobs.id) AS latest_job_id,
        MAX(jobs.created_at) AS latest_created_at,
        COUNT(*) AS total_jobs,
        SUM(CASE WHEN jobs.current_output_id IS NOT NULL THEN 1 ELSE 0 END) AS completed_images
      FROM jobs
      WHERE jobs.client_id = ?
      GROUP BY jobs.batch_id, jobs.client_id, jobs.client_name, jobs.model_name
      ORDER BY latest_job_id DESC
      LIMIT ? OFFSET ?
    `)
    .all(clientId, safePageSize, offset) as DbArchiveBatchRow[];

  return {
    items: rows.map(mapArchiveBatch),
    page: safePage,
    pageSize: safePageSize,
    totalItems,
    totalPages,
  };
};
