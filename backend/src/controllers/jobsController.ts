import type { RequestHandler } from 'express';
import { listCurrentJobs, listJobs, queueJobRegeneration } from '../services/jobService';
import { AppError } from '../utils/appError';
import { isProviderKey } from '../utils/providerCatalog';

export const getJobs: RequestHandler = (_req, res) => {
  res.json(listJobs());
};

export const getCurrentJobs: RequestHandler = (_req, res) => {
  res.json(listCurrentJobs());
};

export const postRegenerateJob: RequestHandler = (req, res) => {
  const jobId = Number(req.params.id);
  const provider = String(req.body.provider ?? '');
  const prompt = String(req.body.prompt ?? '');

  if (!Number.isInteger(jobId)) {
    throw new AppError('Id de trabajo inválido.');
  }

  if (!prompt.trim()) {
    throw new AppError('El prompt es obligatorio para regenerar.');
  }

  if (!isProviderKey(provider)) {
    throw new AppError('Se seleccionó un proveedor no compatible.');
  }

  const job = queueJobRegeneration({
    jobId,
    provider,
    prompt,
  });

  res.status(202).json(job);
};
