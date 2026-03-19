import { parseBackgroundConfig } from '../../background/config';
import { db } from '../../db';
import type { JobOutputRecord, JobRecord } from '@tuto/shared';
import type { JobProcessingRecord } from '../../types/domain';
import type {
  ArchiveBatchSummary,
  ArchiveClientSummary,
  DbArchiveBatchRow,
  DbArchiveClientRow,
  DbJobOutputRow,
  DbJobRow,
} from './types';

export const baseJobsQuery = `
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

export const mapProcessingJob = (row: DbJobRow): JobProcessingRecord => ({
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

export const mapArchiveClient = (row: DbArchiveClientRow): ArchiveClientSummary => ({
  batchCount: row.batch_count,
  id: row.client_id,
  lastBatchCreatedAt: row.last_batch_created_at,
  name: row.client_name,
});

export const mapArchiveBatch = (row: DbArchiveBatchRow): ArchiveBatchSummary => ({
  batchId: row.batch_id,
  clientId: row.client_id,
  clientName: row.client_name,
  completedImages: row.completed_images,
  latestCreatedAt: row.latest_created_at,
  latestJobId: row.latest_job_id,
  modelName: row.model_name,
  totalJobs: row.total_jobs,
});

export const buildJobRecords = (rows: DbJobRow[]): JobRecord[] => {
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
