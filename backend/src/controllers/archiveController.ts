import type { RequestHandler } from 'express';
import { parseArchiveBatchId, parseArchiveClientId, parseArchivePagination } from './requestParsers/jobRequests';
import { listArchiveBatches, listArchiveClients, listJobsByBatchId } from '../services/jobService';

export const getArchiveClients: RequestHandler = (_req, res) => {
  res.json(listArchiveClients());
};

export const getArchiveBatchesByClient: RequestHandler = (req, res) => {
  const clientId = parseArchiveClientId(req.params.clientId);
  const { page, pageSize } = parseArchivePagination(req.query);

  res.json(listArchiveBatches(clientId, page, pageSize));
};

export const getArchiveBatchJobs: RequestHandler = (req, res) => {
  res.json(listJobsByBatchId(parseArchiveBatchId(req.params.batchId)));
};
