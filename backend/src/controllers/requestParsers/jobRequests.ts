import type { RegenerateJobInput } from '../../types/domain';
import { AppError } from '../../utils/appError';
import { isProviderKey } from '../../utils/providerCatalog';

const parsePositiveNumber = (value: unknown, fallbackValue: number): number => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue;
  }

  return Math.floor(parsed);
};

export const parseJobIdParam = (value: unknown): number => {
  const jobId = Number(value);

  if (!Number.isInteger(jobId)) {
    throw new AppError('Id de trabajo inválido.');
  }

  return jobId;
};

export const parseRegenerateJobInput = (params: { id?: unknown }, body: { provider?: unknown; prompt?: unknown }): RegenerateJobInput => {
  const jobId = parseJobIdParam(params.id);
  const provider = String(body.provider ?? '');
  const prompt = String(body.prompt ?? '');

  if (!prompt.trim()) {
    throw new AppError('El prompt es obligatorio para regenerar.');
  }

  if (!isProviderKey(provider)) {
    throw new AppError('Se seleccionó un proveedor no compatible.');
  }

  return {
    jobId,
    provider,
    prompt,
  };
};

export const parseArchiveClientId = (value: unknown): number => {
  const clientId = Number(value);

  if (!Number.isInteger(clientId)) {
    throw new AppError('Cliente inválido para consultar archivo.');
  }

  return clientId;
};

export const parseArchiveBatchId = (value: unknown): string => {
  const batchId = String(value ?? '').trim();

  if (!batchId) {
    throw new AppError('Trabajo archivado inválido.');
  }

  return batchId;
};

export const parseArchivePagination = (query: { page?: unknown; pageSize?: unknown }): { page: number; pageSize: number } => ({
  page: parsePositiveNumber(query.page, 1),
  pageSize: parsePositiveNumber(query.pageSize, 20),
});
