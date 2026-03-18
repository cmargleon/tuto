import { Router } from 'express';
import { getStorageConfig, postPresignUploads } from '../controllers/storageController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(getStorageConfig));
router.post('/presign', asyncHandler(postPresignUploads));

export default router;
