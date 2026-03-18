import path from 'node:path';
import type { RequestHandler } from 'express';
import { parseBackgroundConfig } from '../background/config';
import { createGenerationJobs } from '../services/generationService';
import { defaultAspectRatio, isAspectRatioKey, type ProviderKey, type UploadedStorageFileRecord } from '../types/domain';
import { deleteStoredFile, isAllowedStoragePathForFolder, storeUploadedFile } from '../storage/fileStorage';
import { AppError } from '../utils/appError';

const parseNumericArray = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value.map(Number);
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map(Number) : [];
    } catch {
      return value
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((part) => Number.isInteger(part));
    }
  }

  return [];
};

const parseUploadedGarments = (value: unknown): UploadedStorageFileRecord[] => {
  if (!value) {
    return [];
  }

  let parsedValue: unknown;

  try {
    parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    throw new AppError('Las prendas subidas no tienen un formato válido.');
  }

  if (!Array.isArray(parsedValue)) {
    return [];
  }

  return parsedValue.map((entry, index) => {
    const originalName = String(entry?.originalName ?? '').trim();
    const storagePath = String(entry?.storagePath ?? '').trim();

    if (!originalName || !storagePath || !isAllowedStoragePathForFolder(storagePath, 'garments')) {
      throw new AppError(`La prenda subida ${index + 1} no es válida.`);
    }

    return {
      originalName,
      storagePath,
    };
  });
};

export const postGenerate: RequestHandler = async (req, res) => {
  const clientId = Number(req.body.clientId);
  const modelId = Number(req.body.modelId);
  const poseImageIds = parseNumericArray(req.body.poseImageIds);
  const provider = String(req.body.provider ?? '');
  const aspectRatio = String(req.body.aspectRatio ?? defaultAspectRatio);
  const prompt = String(req.body.prompt ?? '');
  const backgroundConfig = parseBackgroundConfig(req.body.backgroundConfig);
  const files = Array.isArray(req.files) ? req.files : [];
  const uploadedGarmentsFromBody = parseUploadedGarments(req.body.uploadedGarments);

  if (!Number.isInteger(clientId)) {
    throw new AppError('Se requiere un cliente válido.');
  }

  if (!Number.isInteger(modelId)) {
    throw new AppError('Se requiere un modelo válido.');
  }

  if (poseImageIds.some((value: number) => !Number.isInteger(value))) {
    throw new AppError('Los ids de imágenes de pose deben ser numéricos.');
  }

  if (files.length === 0 && uploadedGarmentsFromBody.length === 0) {
    throw new AppError('Sube al menos una prenda.');
  }

  if (!isAspectRatioKey(aspectRatio)) {
    throw new AppError('La proporción seleccionada no es válida.');
  }

  const storedGarmentsFromFiles = await Promise.all(
    files.map(async (file) => {
      const storedGarment = await storeUploadedFile(file, 'garments');

      return {
        originalName: file.originalname,
        storagePath: storedGarment.storagePath,
      };
    }),
  );
  const uploadedGarments = [...uploadedGarmentsFromBody, ...storedGarmentsFromFiles];

  let result;

  try {
    result = createGenerationJobs({
      clientId,
      modelId,
      poseImageIds,
      aspectRatio,
      provider: provider as ProviderKey,
      prompt,
      backgroundConfig,
      garments: uploadedGarments.map((garment, index) => ({
        name: path.parse(garment.originalName).name || `Prenda ${index + 1}`,
        filePath: garment.storagePath,
      })),
    });
  } catch (error) {
    await Promise.allSettled(uploadedGarments.map((garment) => deleteStoredFile(garment.storagePath)));
    throw error;
  }

  res.status(201).json(result);
};
