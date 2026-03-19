import type { RequestHandler } from 'express';
import { parseRegenerateJobInput } from './requestParsers/jobRequests';
import { listCurrentJobs, listJobs, queueJobRegeneration } from '../services/jobService';

export const getJobs: RequestHandler = (_req, res) => {
  res.json(listJobs());
};

export const getCurrentJobs: RequestHandler = (_req, res) => {
  res.json(listCurrentJobs());
};

export const postRegenerateJob: RequestHandler = (req, res) => {
  const job = queueJobRegeneration(parseRegenerateJobInput(req.params, req.body));

  res.status(202).json(job);
};
