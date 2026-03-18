import type { RequestHandler } from 'express';
import { listArchiveBatches, listArchiveClients, listJobsByBatchId } from '../services/jobService';
import { AppError } from '../utils/appError';

const parsePositiveNumber = (value: unknown, fallbackValue: number): number => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue;
  }

  return Math.floor(parsed);
};

export const getArchiveClients: RequestHandler = (_req, res) => {
  res.json(listArchiveClients());
};

export const getArchiveBatchesByClient: RequestHandler = (req, res) => {
  const clientId = Number(req.params.clientId);

  if (!Number.isInteger(clientId)) {
    throw new AppError('Cliente inválido para consultar archivo.');
  }

  const page = parsePositiveNumber(req.query.page, 1);
  const pageSize = parsePositiveNumber(req.query.pageSize, 20);

  res.json(listArchiveBatches(clientId, page, pageSize));
};

export const getArchiveBatchJobs: RequestHandler = (req, res) => {
  const batchId = String(req.params.batchId ?? '').trim();

  if (!batchId) {
    throw new AppError('Trabajo archivado inválido.');
  }

  res.json(listJobsByBatchId(batchId));
};
