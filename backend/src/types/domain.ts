import type {
  AspectRatioKey,
  BackgroundConfig,
  ClientRecord,
  JobOutputRecord,
  JobRecord,
  JobStatus,
  ModelImageRecord,
  ModelRecord,
  ProviderKey,
  UploadedStorageFileRecord,
} from '@tuto/shared';

export type {
  AspectRatioKey,
  BackgroundConfig,
  ClientRecord,
  JobOutputRecord,
  JobRecord,
  JobStatus,
  ModelImageRecord,
  ModelRecord,
  ProviderKey,
  UploadedStorageFileRecord,
};

const aspectRatioOptions: AspectRatioKey[] = ['9:16', '3:4', '2:3', '1:1', '4:3', '3:2', '16:9'];
export const defaultAspectRatio: AspectRatioKey = '9:16';
export const isAspectRatioKey = (value: unknown): value is AspectRatioKey =>
  typeof value === 'string' && aspectRatioOptions.includes(value as AspectRatioKey);

export interface GarmentUploadRecord {
  name: string;
  filePath: string;
  isMultiAngle: boolean;
}

export interface JobProcessingRecord {
  id: number;
  poseImageId: number;
  poseImagePath: string;
  garmentName: string;
  garmentFilePath: string;
  aspectRatio: AspectRatioKey;
  provider: ProviderKey;
  prompt: string;
  backgroundConfig: BackgroundConfig;
}

export interface GenerateJobsInput {
  clientId: number;
  modelId: number;
  poseImageIds: number[];
  garments: GarmentUploadRecord[];
  aspectRatio: AspectRatioKey;
  provider: ProviderKey;
  prompt: string;
  backgroundConfig: BackgroundConfig;
}

export interface RegenerateJobInput {
  jobId: number;
  provider: ProviderKey;
  prompt: string;
}
