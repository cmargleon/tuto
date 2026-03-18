import { Router } from 'express';
import { getArchiveBatchJobs, getArchiveBatchesByClient, getArchiveClients } from '../controllers/archiveController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/clients', asyncHandler(getArchiveClients));
router.get('/clients/:clientId/batches', asyncHandler(getArchiveBatchesByClient));
router.get('/batches/:batchId', asyncHandler(getArchiveBatchJobs));

export default router;
