import { db } from '../../db';
import type { JobRecord } from '@tuto/shared';
import type { JobProcessingRecord } from '../../types/domain';
import { baseJobsQuery, buildJobRecords, mapProcessingJob } from './mappers';
import type { DbJobRow } from './types';

export const listJobs = (): JobRecord[] => {
  const rows = db.prepare(`${baseJobsQuery} ORDER BY jobs.created_at DESC, jobs.id DESC`).all() as DbJobRow[];
  return buildJobRecords(rows);
};

export const listCurrentJobs = (): JobRecord[] => {
  const currentBatch = db
    .prepare('SELECT batch_id FROM jobs GROUP BY batch_id ORDER BY MAX(id) DESC LIMIT 1')
    .get() as { batch_id: string } | undefined;

  if (!currentBatch) {
    return [];
  }

  const rows = db
    .prepare(`${baseJobsQuery} WHERE jobs.batch_id = ? ORDER BY jobs.created_at DESC, jobs.id DESC`)
    .all(currentBatch.batch_id) as DbJobRow[];

  return buildJobRecords(rows);
};

export const listJobsByBatchId = (batchId: string): JobRecord[] => {
  const rows = db
    .prepare(`${baseJobsQuery} WHERE jobs.batch_id = ? ORDER BY jobs.created_at DESC, jobs.id DESC`)
    .all(batchId) as DbJobRow[];

  return buildJobRecords(rows);
};

export const getJobById = (jobId: number): JobRecord | null => {
  const row = db.prepare(`${baseJobsQuery} WHERE jobs.id = ?`).get(jobId) as DbJobRow | undefined;
  return row ? buildJobRecords([row])[0] ?? null : null;
};

export const claimNextPendingJob = (): JobProcessingRecord | null => {
  const claimJob = db.transaction((): JobProcessingRecord | null => {
    const row = db
      .prepare(`
        ${baseJobsQuery}
        WHERE jobs.status = 'pending'
        ORDER BY jobs.queue_priority DESC, jobs.created_at ASC, jobs.id ASC
        LIMIT 1
      `)
      .get() as DbJobRow | undefined;

    if (!row) {
      return null;
    }

    const updateResult = db
      .prepare(
        "UPDATE jobs SET status = 'processing', queue_priority = 0, started_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'",
      )
      .run(row.id);

    if (updateResult.changes === 0) {
      return null;
    }

    return mapProcessingJob(row);
  });

  return claimJob();
};

export const requeueProcessingJobs = (): number => {
  const result = db
    .prepare("UPDATE jobs SET status = 'pending', started_at = NULL WHERE status = 'processing'")
    .run();
  return result.changes;
};

export const requeueStuckJobs = (timeoutMs: number): number => {
  const threshold = new Date(Date.now() - timeoutMs).toISOString().replace('T', ' ').slice(0, 19);
  const result = db
    .prepare(
      `UPDATE jobs
       SET status = 'pending', queue_priority = 0, retry_count = retry_count + 1, started_at = NULL
       WHERE status = 'processing'
         AND started_at IS NOT NULL
         AND started_at <= ?`,
    )
    .run(threshold);
  return result.changes;
};
