import { Router } from 'express';
import { getStorageConfig, postCleanupUploads, postPresignUploads } from '../controllers/storageController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(getStorageConfig));
router.post('/presign', asyncHandler(postPresignUploads));
router.post('/cleanup', asyncHandler(postCleanupUploads));

export default router;
