import { Router } from 'express';
import { deleteClientById, getClients, postClient, putClient } from '../controllers/clientsController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(getClients));
router.post('/', asyncHandler(postClient));
router.put('/:id', asyncHandler(putClient));
router.delete('/:id', asyncHandler(deleteClientById));

export default router;
