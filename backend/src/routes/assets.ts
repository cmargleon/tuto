import { Router } from 'express';
import { getAsset } from '../controllers/assetsController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(getAsset));

export default router;
