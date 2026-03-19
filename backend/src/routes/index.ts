import { Router } from 'express';
import analyticsRoutes from './analytics';
import assetsRoutes from './assets';
import archiveRoutes from './archive';
import clientRoutes from './clients';
import generateRoutes from './generate';
import jobsRoutes from './jobs';
import modelRoutes from './models';
import storageRoutes from './storage';

const router = Router();

router.use('/analytics', analyticsRoutes);
router.use('/assets', assetsRoutes);
router.use('/archive', archiveRoutes);
router.use('/storage', storageRoutes);
router.use('/clients', clientRoutes);
router.use('/models', modelRoutes);
router.use('/generate', generateRoutes);
router.use('/jobs', jobsRoutes);

export default router;
