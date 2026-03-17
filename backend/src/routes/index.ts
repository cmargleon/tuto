import { Router } from 'express';
import clientRoutes from './clients';
import generateRoutes from './generate';
import jobsRoutes from './jobs';
import modelRoutes from './models';

const router = Router();

router.use('/clients', clientRoutes);
router.use('/models', modelRoutes);
router.use('/generate', generateRoutes);
router.use('/jobs', jobsRoutes);

export default router;
