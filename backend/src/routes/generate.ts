import { Router } from 'express';
import { postGenerate } from '../controllers/generationController';
import { createImageUpload } from '../storage/fileStorage';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const upload = createImageUpload();

router.post('/', upload.array('garments', 24), asyncHandler(postGenerate));

export default router;
