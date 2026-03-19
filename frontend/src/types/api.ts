import type {
  AspectRatioKey,
  BackgroundConfig,
  ProviderKey,
  UploadedStorageFileRecord,
} from '@tuto/shared';

export type {
  AnalyticsData,
  ArchiveBatchSummary,
  ArchiveClientSummary,
  AspectRatioKey,
  BackgroundConfig,
  ClientRecord,
  DirectUploadTarget,
  GenerateJobsResponse,
  JobOutputRecord,
  JobRecord,
  JobStatus,
  ModelImageRecord,
  ModelRecord,
  ProviderKey,
  RegenerateJobRequest,
  StorageConfig,
  UploadedStorageFileRecord,
} from '@tuto/shared';

// PaginatedArchiveBatchResult is named PaginatedArchiveBatchResponse in this frontend
export type { PaginatedArchiveBatchResult as PaginatedArchiveBatchResponse } from '@tuto/shared';

// ─── Frontend-specific types ──────────────────────────────────────────────────

export interface GenerateJobsRequest {
  clientId: number;
  modelId: number;
  poseImageIds: number[];
  garments?: File[];
  uploadedGarments?: UploadedStorageFileRecord[];
  garmentIsMultiAngle?: boolean[];
  aspectRatio: AspectRatioKey;
  provider: ProviderKey;
  prompt: string;
  backgroundConfig: BackgroundConfig;
}

export interface ProviderOption {
  key: ProviderKey;
  label: string;
  description: string;
}
