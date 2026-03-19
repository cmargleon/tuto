// ─── Background Config Types ─────────────────────────────────────────────────

export type BackgroundMode =
  | 'white'
  | 'bokeh'
  | 'studio'
  | 'exterior_natural'
  | 'exterior_urbano'
  | 'interior_lifestyle'
  | 'custom';

export type BackgroundScene =
  | 'none'
  | 'arquitectura_moderna'
  | 'calle_limpia'
  | 'terraza'
  | 'fachada_neutra'
  | 'bosque'
  | 'mar'
  | 'sendero'
  | 'jardin'
  | 'campo'
  | 'living_minimalista'
  | 'estudio_creativo'
  | 'cafe_elegante'
  | 'vestidor'
  | 'gimnasio_premium'
  | 'papel_seamless'
  | 'cemento_suave';

export type BackgroundLighting =
  | 'clear_soft_daylight'
  | 'warm_soft_daylight'
  | 'cool_soft_daylight'
  | 'studio_diffused'
  | 'high_key'
  | 'editorial'
  | 'dramatic'
  | 'overcast_soft'
  | 'golden_hour';

export type BackgroundDominantColor =
  | 'white'
  | 'neutral gray'
  | 'warm beige'
  | 'soft blue'
  | 'forest green'
  | 'ocean blue'
  | 'sand'
  | 'black';

export type BackgroundProminence = 'minimal' | 'medium' | 'editorial';
export type BackgroundContrast = 'soft' | 'medium' | 'high';
export type BackgroundRealism = 'catalogo_realista' | 'campana_lifestyle';
export type BackgroundSeparation = 'standard' | 'strong' | 'maximum';

export interface BackgroundConfig {
  mode: BackgroundMode;
  scene: BackgroundScene;
  lighting: BackgroundLighting;
  bokehStrength: number;
  dominantColor: BackgroundDominantColor;
  prominence: BackgroundProminence;
  contrast: BackgroundContrast;
  realism: BackgroundRealism;
  separation: BackgroundSeparation;
  avoidExtraPeople: boolean;
  avoidDistractingProps: boolean;
  avoidTextSignage: boolean;
  customDetail: string;
}

// ─── Core Types ───────────────────────────────────────────────────────────────

export type ProviderKey = 'fal-seedream' | 'fal-banana-pro' | 'openai-gpt-image-1.5';
export type AspectRatioKey = '9:16' | '3:4' | '2:3' | '1:1' | '4:3' | '3:2' | '16:9';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

// ─── Domain Records ───────────────────────────────────────────────────────────

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

// ─── Archive Types ────────────────────────────────────────────────────────────

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

// ─── Analytics Types ──────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  pendingJobs: number;
  successRate: number;
  avgDurationSeconds: number | null;
  totalCostUsd: number;
  projectedMonthlyCostUsd: number | null;
}

export interface AnalyticsDailyVolume {
  date: string;
  completed: number;
  failed: number;
}

export interface AnalyticsProviderStats {
  provider: string;
  completed: number;
  failed: number;
  avgDurationSeconds: number | null;
  costPerImageUsd: number;
  totalCostUsd: number;
}

export interface AnalyticsClientStats {
  clientName: string;
  completed: number;
  totalCostUsd: number;
}

export interface AnalyticsDailyCost {
  date: string;
  costUsd: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  dailyVolume: AnalyticsDailyVolume[];
  byProvider: AnalyticsProviderStats[];
  topClients: AnalyticsClientStats[];
  dailyCost: AnalyticsDailyCost[];
}

// ─── API Contract Types ───────────────────────────────────────────────────────

export interface StorageConfig {
  directUpload: boolean;
  driver: 'local' | 's3';
  maxFileSizeMb: number;
}

export interface DirectUploadTarget {
  headers: Record<string, string>;
  storagePath: string;
  uploadUrl: string;
}

export interface GenerateJobsResponse {
  createdJobs: number;
}

export interface RegenerateJobRequest {
  provider: ProviderKey;
  prompt: string;
}
