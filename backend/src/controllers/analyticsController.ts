import type { Request, Response } from 'express';
import { getAnalytics } from '../services/analyticsService';

export const getAnalyticsHandler = (_req: Request, res: Response): void => {
  const data = getAnalytics();
  res.json(data);
};
