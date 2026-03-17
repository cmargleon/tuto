import { Router } from 'express';
import { deleteModelById, getModels, postModel, putModel } from '../controllers/modelsController';
import { createImageUpload } from '../storage/fileStorage';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const upload = createImageUpload('models');

router.get('/', asyncHandler(getModels));
router.post('/', upload.array('images', 20), asyncHandler(postModel));
router.put('/:id', asyncHandler(putModel));
router.delete('/:id', asyncHandler(deleteModelById));

export default router;
