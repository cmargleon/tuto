import type { BackgroundConfig } from '../background/config';

export type ProviderKey = 'fal-seedream' | 'fal-banana-pro' | 'openai-gpt-image-1.5';
export type AspectRatioKey = '9:16' | '3:4' | '2:3' | '1:1' | '4:3' | '3:2' | '16:9';
const aspectRatioOptions: AspectRatioKey[] = ['9:16', '3:4', '2:3', '1:1', '4:3', '3:2', '16:9'];
export const defaultAspectRatio: AspectRatioKey = '9:16';
export const isAspectRatioKey = (value: unknown): value is AspectRatioKey =>
  typeof value === 'string' && aspectRatioOptions.includes(value as AspectRatioKey);

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ModelImageRecord {
  id: number;
  modelId: number;
  filePath: string;
  createdAt: string;
}

export interface ModelRecord {
  id: number;
  clientId: number | null;
  clientName: string;
  name: string;
  createdAt: string;
  images: ModelImageRecord[];
}

export interface ClientRecord {
  id: number;
  name: string;
  createdAt: string;
}

export interface GarmentUploadRecord {
  name: string;
  filePath: string;
}

export interface UploadedStorageFileRecord {
  originalName: string;
  storagePath: string;
}

export interface JobOutputRecord {
  id: number;
  jobId: number;
  provider: ProviderKey;
  prompt: string;
  resultImage: string;
  createdAt: string;
}

export interface JobRecord {
  id: number;
  batchId: string;
  clientId: number | null;
  clientName: string;
  modelId: number;
  modelName: string;
  poseImageId: number;
  poseImagePath: string;
  garmentName: string;
  garmentFilePath: string;
  aspectRatio: AspectRatioKey;
  provider: ProviderKey;
  prompt: string;
  backgroundConfig: BackgroundConfig;
  status: JobStatus;
  currentOutputId: number | null;
  currentOutput: JobOutputRecord | null;
  outputs: JobOutputRecord[];
  createdAt: string;
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
