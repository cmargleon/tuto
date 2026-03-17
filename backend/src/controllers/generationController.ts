import path from 'node:path';
import type { RequestHandler } from 'express';
import { parseBackgroundConfig } from '../background/config';
import { createGenerationJobs } from '../services/generationService';
import { defaultAspectRatio, isAspectRatioKey, type ProviderKey } from '../types/domain';
import { toPublicUploadPath } from '../storage/fileStorage';
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

export const postGenerate: RequestHandler = (req, res) => {
  const clientId = Number(req.body.clientId);
  const modelId = Number(req.body.modelId);
  const poseImageIds = parseNumericArray(req.body.poseImageIds);
  const provider = String(req.body.provider ?? '');
  const aspectRatio = String(req.body.aspectRatio ?? defaultAspectRatio);
  const prompt = String(req.body.prompt ?? '');
  const backgroundConfig = parseBackgroundConfig(req.body.backgroundConfig);
  const files = Array.isArray(req.files) ? req.files : [];

  if (!Number.isInteger(clientId)) {
    throw new AppError('Se requiere un cliente válido.');
  }

  if (!Number.isInteger(modelId)) {
    throw new AppError('Se requiere un modelo válido.');
  }

  if (poseImageIds.some((value: number) => !Number.isInteger(value))) {
    throw new AppError('Los ids de imágenes de pose deben ser numéricos.');
  }

  if (files.length === 0) {
    throw new AppError('Sube al menos una prenda.');
  }

  if (!isAspectRatioKey(aspectRatio)) {
    throw new AppError('La proporción seleccionada no es válida.');
  }

  const result = createGenerationJobs({
    clientId,
    modelId,
    poseImageIds,
    aspectRatio,
    provider: provider as ProviderKey,
    prompt,
    backgroundConfig,
    garments: files.map((file) => ({
      name: path.parse(file.originalname).name || `Prenda ${file.filename}`,
      filePath: toPublicUploadPath('garments', file.filename),
    })),
  });

  res.status(201).json(result);
};
