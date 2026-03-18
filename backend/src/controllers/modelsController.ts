import type { RequestHandler } from 'express';
import { createModel, deleteModel, listModels, updateModel } from '../services/modelService';
import { deleteStoredFile, isAllowedStoragePathForFolder, storeUploadedFile } from '../storage/fileStorage';
import type { UploadedStorageFileRecord } from '../types/domain';
import { AppError } from '../utils/appError';

const parseUploadedImages = (value: unknown): UploadedStorageFileRecord[] => {
  if (!value) {
    return [];
  }

  let parsedValue: unknown;

  try {
    parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    throw new AppError('Las imágenes subidas no tienen un formato válido.');
  }

  if (!Array.isArray(parsedValue)) {
    return [];
  }

  return parsedValue.map((entry, index) => {
    const originalName = String(entry?.originalName ?? '').trim();
    const storagePath = String(entry?.storagePath ?? '').trim();

    if (!originalName || !storagePath || !isAllowedStoragePathForFolder(storagePath, 'models')) {
      throw new AppError(`La imagen subida ${index + 1} no es válida.`);
    }

    return {
      originalName,
      storagePath,
    };
  });
};

export const getModels: RequestHandler = (_req, res) => {
  res.json(listModels());
};

export const postModel: RequestHandler = async (req, res) => {
  const clientId = Number(req.body.clientId);
  const files = Array.isArray(req.files) ? req.files : [];
  const uploadedImagesFromBody = parseUploadedImages(req.body.uploadedImages);
  const uploadedImagesFromFiles = await Promise.all(
    files.map(async (file) => {
      const storedImage = await storeUploadedFile(file, 'models');

      return {
        originalName: file.originalname,
        storagePath: storedImage.storagePath,
      };
    }),
  );
  const images = [...uploadedImagesFromBody, ...uploadedImagesFromFiles];

  try {
    const model = await createModel({
      clientId,
      name: String(req.body.name ?? ''),
      images,
    });

    res.status(201).json(model);
  } catch (error) {
    await Promise.allSettled(images.map((image) => deleteStoredFile(image.storagePath)));
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
