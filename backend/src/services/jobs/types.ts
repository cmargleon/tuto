import type {
  ArchiveBatchSummary,
  ArchiveClientSummary,
  AspectRatioKey,
  JobOutputRecord,
  JobRecord,
  JobStatus,
  PaginatedArchiveBatchResult,
  ProviderKey,
} from '@tuto/shared';

export type {
  ArchiveBatchSummary,
  ArchiveClientSummary,
  JobOutputRecord,
  JobRecord,
  PaginatedArchiveBatchResult,
};

export interface DbJobRow {
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
  started_at: string | null;
  retry_count: number;
  created_at: string;
}

export interface DbJobOutputRow {
  id: number;
  job_id: number;
  provider: ProviderKey;
  prompt: string;
  result_image: string;
  created_at: string;
}

export interface DbArchiveClientRow {
  batch_count: number;
  client_id: number;
  client_name: string;
  last_batch_created_at: string;
}

export interface DbArchiveBatchRow {
  batch_id: string;
  client_id: number | null;
  client_name: string;
  completed_images: number;
  latest_created_at: string;
  latest_job_id: number;
  model_name: string;
  total_jobs: number;
}

export interface JobOutputLifecycleResult {
  outputId: number;
  previousImagePaths: string[];
}
