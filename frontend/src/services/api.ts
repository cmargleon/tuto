import axios from 'axios';
import type {
  AnalyticsData,
  AspectRatioKey,
  ArchiveClientSummary,
  DirectUploadTarget,
  ClientRecord,
  GenerateJobsRequest,
  GenerateJobsResponse,
  JobRecord,
  ModelRecord,
  PaginatedArchiveBatchResponse,
  ProviderOption,
  RegenerateJobRequest,
  StorageConfig,
  UploadedStorageFileRecord,
} from '../types/api';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: apiBaseUrl,
});

export const providerOptions: ProviderOption[] = [
  {
    key: 'fal-seedream',
    label: 'fal.ai seedream',
    description: 'Modelo equilibrado de edición para pruebas virtuales consistentes de estilo catálogo.',
  },
  {
    key: 'fal-banana-pro',
    label: 'fal.ai banana-pro',
    description: 'Ruta de edición de mayor fidelidad usando el editor de imágenes nano-banana-pro.',
  },
  {
    key: 'openai-gpt-image-1.5',
    label: 'OpenAI gpt-image-1.5',
    description: 'Flujo de edición de OpenAI con dos imágenes de referencia y almacenamiento privado del resultado.',
  },
];

export const aspectRatioOptions: Array<{ key: AspectRatioKey; label: string }> = [
  { key: '9:16', label: '9:16' },
  { key: '3:4', label: '3:4' },
  { key: '2:3', label: '2:3' },
  { key: '1:1', label: '1:1' },
  { key: '4:3', label: '4:3' },
  { key: '3:2', label: '3:2' },
  { key: '16:9', label: '16:9' },
];

export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'No se pudo conectar con el backend. Revisa que el servidor siga corriendo y que la red esté disponible.';
    }

    return String(error.response?.data?.message ?? error.message);
  }

  if (error instanceof Error) {
    if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
      return 'El navegador no pudo completar la subida al storage. Revisa CORS del bucket S3 o tu conexión.';
    }

    return error.message;
  }

  return 'Error inesperado.';
};

export const resolveAssetUrl = (filePath: string | null | undefined): string => {
  if (!filePath) {
    return '';
  }

  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }

  const assetPath = `/api/assets?path=${encodeURIComponent(filePath)}`;

  if (!apiBaseUrl) {
    return assetPath;
  }

  return new URL(assetPath, apiBaseUrl).toString();
};

// Same as resolveAssetUrl but forces content to stream through the backend (proxy=1).
// Use this for fetch() calls (e.g. zip downloads) to avoid CORS errors when the backend
// would otherwise redirect to a cross-origin URL such as a pre-signed S3 URL.
export const resolveProxyAssetUrl = (filePath: string | null | undefined): string => {
  if (!filePath) {
    return '';
  }

  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }

  const assetPath = `/api/assets?path=${encodeURIComponent(filePath)}&proxy=1`;

  if (!apiBaseUrl) {
    return assetPath;
  }

  return new URL(assetPath, apiBaseUrl).toString();
};

export const fetchModels = async (): Promise<ModelRecord[]> => {
  const response = await api.get<ModelRecord[]>('/api/models');
  return response.data;
};

export const fetchStorageConfig = async (): Promise<StorageConfig> => {
  const response = await api.get<StorageConfig>('/api/storage');
  return response.data;
};

export const fetchClients = async (): Promise<ClientRecord[]> => {
  const response = await api.get<ClientRecord[]>('/api/clients');
  return response.data;
};

export const createClient = async (name: string): Promise<ClientRecord> => {
  const response = await api.post<ClientRecord>('/api/clients', { name });
  return response.data;
};

export const updateClient = async (clientId: number, name: string): Promise<ClientRecord> => {
  const response = await api.put<ClientRecord>(`/api/clients/${clientId}`, { name });
  return response.data;
};

export const deleteClient = async (clientId: number): Promise<void> => {
  await api.delete(`/api/clients/${clientId}`);
};

export const createModel = async (input: {
  name: string;
  clientId: number;
  files?: FileList | File[];
  uploadedImages?: UploadedStorageFileRecord[];
}): Promise<ModelRecord> => {
  let response;

  if (input.uploadedImages && input.uploadedImages.length > 0) {
    response = await api.post<ModelRecord>('/api/models', {
      name: input.name,
      clientId: input.clientId,
      uploadedImages: input.uploadedImages,
    });
  } else {
    const payload = new FormData();
    payload.append('name', input.name);
    payload.append('clientId', String(input.clientId));

    Array.from(input.files ?? []).forEach((file) => {
      payload.append('images', file);
    });

    response = await api.post<ModelRecord>('/api/models', payload, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  return response.data;
};

export const updateModel = async (modelId: number, input: { name: string; clientId: number }): Promise<ModelRecord> => {
  const response = await api.put<ModelRecord>(`/api/models/${modelId}`, input);
  return response.data;
};

export const deleteModel = async (modelId: number): Promise<void> => {
  await api.delete(`/api/models/${modelId}`);
};

export const generateJobs = async (input: GenerateJobsRequest): Promise<GenerateJobsResponse> => {
  let response;

  if (input.uploadedGarments && input.uploadedGarments.length > 0) {
    response = await api.post<GenerateJobsResponse>('/api/generate', {
      clientId: input.clientId,
      modelId: input.modelId,
      poseImageIds: input.poseImageIds,
      aspectRatio: input.aspectRatio,
      provider: input.provider,
      prompt: input.prompt,
      backgroundConfig: input.backgroundConfig,
      uploadedGarments: input.uploadedGarments,
      garmentIsMultiAngle: input.garmentIsMultiAngle ?? [],
    });
  } else {
    const payload = new FormData();

    payload.append('clientId', String(input.clientId));
    payload.append('modelId', String(input.modelId));
    payload.append('poseImageIds', JSON.stringify(input.poseImageIds));
    payload.append('aspectRatio', input.aspectRatio);
    payload.append('provider', input.provider);
    payload.append('prompt', input.prompt);
    payload.append('backgroundConfig', JSON.stringify(input.backgroundConfig));
    payload.append('garmentIsMultiAngle', JSON.stringify(input.garmentIsMultiAngle ?? []));

    (input.garments ?? []).forEach((garment) => {
      payload.append('garments', garment);
    });

    response = await api.post<GenerateJobsResponse>('/api/generate', payload, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  return response.data;
};

export const fetchJobs = async (): Promise<JobRecord[]> => {
  const response = await api.get<JobRecord[]>('/api/jobs');
  return response.data;
};

export const fetchCurrentJobs = async (): Promise<JobRecord[]> => {
  const response = await api.get<JobRecord[]>('/api/jobs/current');
  return response.data;
};

export const fetchArchiveClients = async (): Promise<ArchiveClientSummary[]> => {
  const response = await api.get<ArchiveClientSummary[]>('/api/archive/clients');
  return response.data;
};

export const fetchArchiveBatches = async (
  clientId: number,
  page = 1,
  pageSize = 20,
): Promise<PaginatedArchiveBatchResponse> => {
  const response = await api.get<PaginatedArchiveBatchResponse>(`/api/archive/clients/${clientId}/batches`, {
    params: {
      page,
      pageSize,
    },
  });

  return response.data;
};

export const fetchArchiveBatchJobs = async (batchId: string): Promise<JobRecord[]> => {
  const response = await api.get<JobRecord[]>(`/api/archive/batches/${encodeURIComponent(batchId)}`);
  return response.data;
};

export const requestPresignedUploads = async (
  folder: 'models' | 'garments',
  files: File[],
): Promise<DirectUploadTarget[]> => {
  const response = await api.post<{ uploads: DirectUploadTarget[] }>('/api/storage/presign', {
    folder,
    files: files.map((file) => ({
      name: file.name,
      contentType: file.type || 'application/octet-stream',
    })),
  });

  return response.data.uploads;
};

export const cleanupDirectUploads = async (folder: 'models' | 'garments', paths: string[]): Promise<void> => {
  if (paths.length === 0) {
    return;
  }

  await api.post('/api/storage/cleanup', {
    folder,
    paths,
  });
};

export const regenerateJob = async (jobId: number, input: RegenerateJobRequest): Promise<JobRecord> => {
  const response = await api.post<JobRecord>(`/api/jobs/${jobId}/regenerate`, input);
  return response.data;
};

export const fetchAnalytics = async (): Promise<AnalyticsData> => {
  const response = await api.get<AnalyticsData>('/api/analytics');
  return response.data;
};
