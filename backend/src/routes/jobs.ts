import { Router } from 'express';
import { getCurrentJobs, getJobs, postRegenerateJob } from '../controllers/jobsController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/current', asyncHandler(getCurrentJobs));
router.get('/', asyncHandler(getJobs));
router.post('/:id/regenerate', asyncHandler(postRegenerateJob));

export default router;
