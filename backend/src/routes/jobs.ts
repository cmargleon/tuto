import { Router } from 'express';
import { getJobs, postRegenerateJob } from '../controllers/jobsController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(getJobs));
router.post('/:id/regenerate', asyncHandler(postRegenerateJob));

export default router;
