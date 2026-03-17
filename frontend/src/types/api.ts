import type { BackgroundConfig } from '../features/background/backgroundConfig';

export type ProviderKey = 'fal-seedream' | 'fal-banana-pro' | 'openai-gpt-image-1.5';
export type AspectRatioKey = '9:16' | '3:4' | '2:3' | '1:1' | '4:3' | '3:2' | '16:9';

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

export interface GenerateJobsRequest {
  clientId: number;
  modelId: number;
  poseImageIds: number[];
  garments: File[];
  aspectRatio: AspectRatioKey;
  provider: ProviderKey;
  prompt: string;
  backgroundConfig: BackgroundConfig;
}

export interface GenerateJobsResponse {
  createdJobs: number;
}

export interface RegenerateJobRequest {
  provider: ProviderKey;
  prompt: string;
}

export interface ProviderOption {
  key: ProviderKey;
  label: string;
  description: string;
}
