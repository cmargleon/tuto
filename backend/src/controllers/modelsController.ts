import type { RequestHandler } from 'express';
import { createModel, deleteModel, listModels, updateModel } from '../services/modelService';
import { cleanupUploadedStorageFiles, normalizeUploadedStorageFiles } from '../utils/uploadedStorageFiles';
import { AppError } from '../utils/appError';

export const getModels: RequestHandler = (_req, res) => {
  res.json(listModels());
};

export const postModel: RequestHandler = async (req, res) => {
  const clientId = Number(req.body.clientId);
  const files = Array.isArray(req.files) ? req.files : [];
  const images = await normalizeUploadedStorageFiles({
    files,
    folder: 'models',
    invalidCollectionMessage: 'Las imágenes subidas no tienen un formato válido.',
    invalidItemMessage: (index) => `La imagen subida ${index + 1} no es válida.`,
    rawValue: req.body.uploadedImages,
  });

  try {
    const model = await createModel({
      clientId,
      name: String(req.body.name ?? ''),
      images,
    });

    res.status(201).json(model);
  } catch (error) {
    await cleanupUploadedStorageFiles(images);
    throw error;
  }
};

export const putModel: RequestHandler = (req, res) => {
  const modelId = Number(req.params.id);

  if (!Number.isInteger(modelId)) {
    throw new AppError('Id de modelo inválido.');
  }

  const model = updateModel(modelId, {
    clientId: Number(req.body.clientId),
    name: String(req.body.name ?? ''),
  });
  res.json(model);
};

export const deleteModelById: RequestHandler = async (req, res) => {
  const modelId = Number(req.params.id);

  if (!Number.isInteger(modelId)) {
    throw new AppError('Id de modelo inválido.');
  }

  await deleteModel(modelId);
  res.status(204).send();
};
