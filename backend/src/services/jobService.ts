import { db } from '../db';
import { parseBackgroundConfig } from '../background/config';
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

const buildJobRecords = (rows: DbJobRow[]): JobRecord[] => {
  const outputRows = db
    .prepare('SELECT id, job_id, provider, prompt, result_image, created_at FROM job_outputs ORDER BY created_at ASC, id ASC')
    .all() as DbJobOutputRow[];

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

export const completeJob = (jobId: number, output: { provider: ProviderKey; prompt: string; resultImage: string }): number => {
  const saveOutput = db.transaction(() => {
    const outputResult = db
      .prepare('INSERT INTO job_outputs (job_id, provider, prompt, result_image) VALUES (?, ?, ?, ?)')
      .run(jobId, output.provider, output.prompt, output.resultImage);

    const outputId = Number(outputResult.lastInsertRowid);

    db.prepare("UPDATE jobs SET status = 'completed', provider = ?, current_output_id = ?, queue_priority = 0 WHERE id = ?").run(
      output.provider,
      outputId,
      jobId,
    );

    return outputId;
  });

  return saveOutput();
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
