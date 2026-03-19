import path from 'node:path';
import type { RequestHandler } from 'express';
import { parseBackgroundConfig } from '../background/config';
import { createGenerationJobs } from '../services/generationService';
import { defaultAspectRatio, isAspectRatioKey, type ProviderKey } from '../types/domain';
import { cleanupUploadedStorageFiles, normalizeUploadedStorageFiles } from '../utils/uploadedStorageFiles';
import { AppError } from '../utils/appError';

const parseBooleanArray = (value: unknown): boolean[] => {
  if (Array.isArray(value)) {
    return value.map(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map(Boolean) : [];
    } catch {
      return [];
    }
  }

  return [];
};

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

export const postGenerate: RequestHandler = async (req, res) => {
  const clientId = Number(req.body.clientId);
  const modelId = Number(req.body.modelId);
  const poseImageIds = parseNumericArray(req.body.poseImageIds);
  const provider = String(req.body.provider ?? '');
  const aspectRatio = String(req.body.aspectRatio ?? defaultAspectRatio);
  const prompt = String(req.body.prompt ?? '');
  const backgroundConfig = parseBackgroundConfig(req.body.backgroundConfig);
  const garmentIsMultiAngle = parseBooleanArray(req.body.garmentIsMultiAngle);
  const files = Array.isArray(req.files) ? req.files : [];
  const uploadedGarments = await normalizeUploadedStorageFiles({
    files,
    folder: 'garments',
    invalidCollectionMessage: 'Las prendas subidas no tienen un formato válido.',
    invalidItemMessage: (index) => `La prenda subida ${index + 1} no es válida.`,
    rawValue: req.body.uploadedGarments,
  });

  if (!Number.isInteger(clientId)) {
    throw new AppError('Se requiere un cliente válido.');
  }

  if (!Number.isInteger(modelId)) {
    throw new AppError('Se requiere un modelo válido.');
  }

  if (poseImageIds.some((value: number) => !Number.isInteger(value))) {
    throw new AppError('Los ids de imágenes de pose deben ser numéricos.');
  }

  if (uploadedGarments.length === 0) {
    throw new AppError('Sube al menos una prenda.');
  }

  if (!isAspectRatioKey(aspectRatio)) {
    throw new AppError('La proporción seleccionada no es válida.');
  }

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
        isMultiAngle: garmentIsMultiAngle[index] ?? false,
      })),
    });
  } catch (error) {
    await cleanupUploadedStorageFiles(uploadedGarments);
    throw error;
  }

  res.status(201).json(result);
};
