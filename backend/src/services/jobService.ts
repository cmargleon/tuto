import { db } from '../db';
import { parseBackgroundConfig } from '../background/config';
import { deleteStoredFile } from '../storage/fileStorage';
import type {
  AspectRatioKey,
  JobOutputRecord,
  JobProcessingRecord,
  JobRecord,
  JobStatus,
  ProviderKey,
  RegenerateJobInput,
} from '../types/domain';
import { AppError } from '../utils/appError';

interface DbJobRow {
  id: number;
  batch_id: string;
  client_id: number | null;
  client_name: string;
  model_id: number;
  model_name: string;
  pose_image_id: number;
  pose_image_path: string;
  garment_name: string;
  garment_file_path: string;
  aspect_ratio: AspectRatioKey;
  provider: ProviderKey;
  prompt: string;
  background_config: string;
  status: JobStatus;
  current_output_id: number | null;
  created_at: string;
}

interface DbJobOutputRow {
  id: number;
  job_id: number;
  provider: ProviderKey;
  prompt: string;
  result_image: string;
  created_at: string;
}

interface DbArchiveClientRow {
  batch_count: number;
  client_id: number;
  client_name: string;
  last_batch_created_at: string;
}

interface DbArchiveBatchRow {
  batch_id: string;
  client_id: number | null;
  client_name: string;
  completed_images: number;
  latest_created_at: string;
  latest_job_id: number;
  model_name: string;
  total_jobs: number;
}

export interface ArchiveClientSummary {
  batchCount: number;
  id: number;
  lastBatchCreatedAt: string;
  name: string;
}

export interface ArchiveBatchSummary {
  batchId: string;
  clientId: number | null;
  clientName: string;
  completedImages: number;
  latestCreatedAt: string;
  latestJobId: number;
  modelName: string;
  totalJobs: number;
}

export interface PaginatedArchiveBatchResult {
  items: ArchiveBatchSummary[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const baseJobsQuery = `
  SELECT
    jobs.id,
    jobs.batch_id,
    jobs.client_id,
    jobs.client_name,
    jobs.model_id,
    jobs.model_name,
    jobs.pose_image_id,
    model_images.file_path AS pose_image_path,
    jobs.garment_name,
    jobs.garment_file_path,
    jobs.aspect_ratio,
    jobs.provider,
    jobs.prompt,
    jobs.background_config,
    jobs.status,
    jobs.current_output_id,
    jobs.created_at
  FROM jobs
  INNER JOIN model_images ON model_images.id = jobs.pose_image_id
`;

const mapJobOutput = (row: DbJobOutputRow): JobOutputRecord => ({
  id: row.id,
  jobId: row.job_id,
  provider: row.provider,
  prompt: row.prompt,
  resultImage: row.result_image,
  createdAt: row.created_at,
});

const mapProcessingJob = (row: DbJobRow): JobProcessingRecord => ({
  id: row.id,
  poseImageId: row.pose_image_id,
  poseImagePath: row.pose_image_path,
  garmentName: row.garment_name,
  garmentFilePath: row.garment_file_path,
  aspectRatio: row.aspect_ratio,
  provider: row.provider,
  prompt: row.prompt,
  backgroundConfig: parseBackgroundConfig(row.background_config),
});

const mapArchiveClient = (row: DbArchiveClientRow): ArchiveClientSummary => ({
  batchCount: row.batch_count,
  id: row.client_id,
  lastBatchCreatedAt: row.last_batch_created_at,
  name: row.client_name,
});

const mapArchiveBatch = (row: DbArchiveBatchRow): ArchiveBatchSummary => ({
  batchId: row.batch_id,
  clientId: row.client_id,
  clientName: row.client_name,
  completedImages: row.completed_images,
  latestCreatedAt: row.latest_created_at,
  latestJobId: row.latest_job_id,
  modelName: row.model_name,
  totalJobs: row.total_jobs,
});

const buildJobRecords = (rows: DbJobRow[]): JobRecord[] => {
  if (rows.length === 0) {
    return [];
  }

  const jobIds = Array.from(new Set(rows.map((row) => row.id)));
  const jobIdPlaceholders = jobIds.map(() => '?').join(', ');
  const outputRows = db
    .prepare(
      `SELECT id, job_id, provider, prompt, result_image, created_at
       FROM job_outputs
       WHERE job_id IN (${jobIdPlaceholders})
       ORDER BY created_at ASC, id ASC`,
    )
    .all(...jobIds) as DbJobOutputRow[];

  const outputsByJobId = new Map<number, JobOutputRecord[]>();

  outputRows.forEach((row) => {
    const currentOutputs = outputsByJobId.get(row.job_id) ?? [];
    currentOutputs.push(mapJobOutput(row));
    outputsByJobId.set(row.job_id, currentOutputs);
  });

  return rows.map((row) => {
    const outputs = outputsByJobId.get(row.id) ?? [];
    const currentOutput = outputs.find((output) => output.id === row.current_output_id) ?? outputs[outputs.length - 1] ?? null;

    return {
      id: row.id,
      batchId: row.batch_id,
      clientId: row.client_id,
      clientName: row.client_name,
      modelId: row.model_id,
      modelName: row.model_name,
      poseImageId: row.pose_image_id,
      poseImagePath: row.pose_image_path,
      garmentName: row.garment_name,
      garmentFilePath: row.garment_file_path,
      aspectRatio: row.aspect_ratio,
      provider: row.provider,
      prompt: row.prompt,
      backgroundConfig: parseBackgroundConfig(row.background_config),
      status: row.status,
      currentOutputId: row.current_output_id,
      currentOutput,
      outputs,
      createdAt: row.created_at,
    };
  });
};

export const listJobs = (): JobRecord[] => {
  const rows = db.prepare(`${baseJobsQuery} ORDER BY jobs.created_at DESC, jobs.id DESC`).all() as DbJobRow[];
  return buildJobRecords(rows);
};

export const listCurrentJobs = (): JobRecord[] => {
  const currentBatch = db
    .prepare('SELECT batch_id FROM jobs ORDER BY created_at DESC, id DESC LIMIT 1')
    .get() as { batch_id: string } | undefined;

  if (!currentBatch) {
    return [];
  }

  const rows = db
    .prepare(`${baseJobsQuery} WHERE jobs.batch_id = ? ORDER BY jobs.created_at DESC, jobs.id DESC`)
    .all(currentBatch.batch_id) as DbJobRow[];

  return buildJobRecords(rows);
};

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

export const listJobsByBatchId = (batchId: string): JobRecord[] => {
  const rows = db
    .prepare(`${baseJobsQuery} WHERE jobs.batch_id = ? ORDER BY jobs.created_at DESC, jobs.id DESC`)
    .all(batchId) as DbJobRow[];

  return buildJobRecords(rows);
};

const getJobById = (jobId: number): JobRecord | null => {
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
      .prepare("UPDATE jobs SET status = 'processing', queue_priority = 0 WHERE id = ? AND status = 'pending'")
      .run(row.id);

    if (updateResult.changes === 0) {
      return null;
    }

    return mapProcessingJob(row);
  });

  return claimJob();
};

export const requeueProcessingJobs = (): number => {
  const result = db.prepare("UPDATE jobs SET status = 'pending' WHERE status = 'processing'").run();
  return result.changes;
};

export const completeJob = async (
  jobId: number,
  output: { provider: ProviderKey; prompt: string; resultImage: string },
): Promise<number> => {
  const saveOutput = db.transaction(() => {
    const previousOutputs = db
      .prepare('SELECT id, result_image FROM job_outputs WHERE job_id = ? ORDER BY created_at ASC, id ASC')
      .all(jobId) as Array<{ id: number; result_image: string }>;
    const outputResult = db
      .prepare('INSERT INTO job_outputs (job_id, provider, prompt, result_image) VALUES (?, ?, ?, ?)')
      .run(jobId, output.provider, output.prompt, output.resultImage);

    const outputId = Number(outputResult.lastInsertRowid);

    db.prepare("UPDATE jobs SET status = 'completed', provider = ?, current_output_id = ?, queue_priority = 0 WHERE id = ?").run(
      output.provider,
      outputId,
      jobId,
    );

    if (previousOutputs.length > 0) {
      const deletePreviousOutput = db.prepare('DELETE FROM job_outputs WHERE id = ?');

      previousOutputs.forEach((previousOutput) => {
        deletePreviousOutput.run(previousOutput.id);
      });
    }

    return {
      outputId,
      previousImagePaths: previousOutputs.map((row) => row.result_image),
    };
  });

  const { outputId, previousImagePaths } = saveOutput();

  await Promise.allSettled(previousImagePaths.map((imagePath) => deleteStoredFile(imagePath)));

  return outputId;
};

export const failJob = (jobId: number): void => {
  db.prepare("UPDATE jobs SET status = 'failed', queue_priority = 0 WHERE id = ?").run(jobId);
};

export const queueJobRegeneration = (input: RegenerateJobInput): JobRecord => {
  const existingJob = getJobById(input.jobId);

  if (!existingJob) {
    throw new AppError('Trabajo no encontrado.', 404);
  }

  if (existingJob.status === 'processing') {
    throw new AppError('Este trabajo ya se está procesando. Espera a que termine antes de regenerarlo.');
  }

  db.prepare("UPDATE jobs SET provider = ?, prompt = ?, status = 'pending', queue_priority = 1 WHERE id = ?").run(
    input.provider,
    input.prompt.trim() || existingJob.prompt,
    input.jobId,
  );

  const updatedJob = getJobById(input.jobId);

  if (!updatedJob) {
    throw new AppError('No se pudo cargar el trabajo actualizado.', 500);
  }

  return updatedJob;
};

export const addJobLog = (jobId: number, providerResponse: unknown, outputId: number | null = null): void => {
  const payload = typeof providerResponse === 'string' ? providerResponse : JSON.stringify(providerResponse, null, 2);
  db.prepare('INSERT INTO job_logs (job_id, output_id, provider_response) VALUES (?, ?, ?)').run(jobId, outputId, payload);
};
