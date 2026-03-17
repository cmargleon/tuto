import axios from 'axios';
import type {
  AspectRatioKey,
  ClientRecord,
  GenerateJobsRequest,
  GenerateJobsResponse,
  JobRecord,
  ModelRecord,
  ProviderOption,
  RegenerateJobRequest,
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
    description: 'Flujo de edición de OpenAI con dos imágenes de referencia y almacenamiento local del resultado.',
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
    return String(error.response?.data?.message ?? error.message);
  }

  return error instanceof Error ? error.message : 'Error inesperado.';
};

export const resolveAssetUrl = (filePath: string | null | undefined): string => {
  if (!filePath) {
    return '';
  }

  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }

  if (!apiBaseUrl) {
    return filePath;
  }

  return new URL(filePath, apiBaseUrl).toString();
};

export const fetchModels = async (): Promise<ModelRecord[]> => {
  const response = await api.get<ModelRecord[]>('/api/models');
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

export const createModel = async (input: { name: string; clientId: number; files: FileList | File[] }): Promise<ModelRecord> => {
  const payload = new FormData();
  payload.append('name', input.name);
  payload.append('clientId', String(input.clientId));

  Array.from(input.files).forEach((file) => {
    payload.append('images', file);
  });

  const response = await api.post<ModelRecord>('/api/models', payload, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
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
  const payload = new FormData();

  payload.append('clientId', String(input.clientId));
  payload.append('modelId', String(input.modelId));
  payload.append('poseImageIds', JSON.stringify(input.poseImageIds));
  payload.append('aspectRatio', input.aspectRatio);
  payload.append('provider', input.provider);
  payload.append('prompt', input.prompt);
  payload.append('backgroundConfig', JSON.stringify(input.backgroundConfig));

  input.garments.forEach((garment) => {
    payload.append('garments', garment);
  });

  const response = await api.post<GenerateJobsResponse>('/api/generate', payload, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const fetchJobs = async (): Promise<JobRecord[]> => {
  const response = await api.get<JobRecord[]>('/api/jobs');
  return response.data;
};

export const regenerateJob = async (jobId: number, input: RegenerateJobRequest): Promise<JobRecord> => {
  const response = await api.post<JobRecord>(`/api/jobs/${jobId}/regenerate`, input);
  return response.data;
};
