import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { createDirectUploadTargets, type ClientUploadFolder } from '../storage/fileStorage';
import { AppError } from '../utils/appError';

const parseFolder = (value: unknown): ClientUploadFolder => {
  if (value === 'models' || value === 'garments') {
    return value;
  }

  throw new AppError('La carpeta de upload solicitada no es válida.');
};

const parseUploadDescriptor = (
  value: unknown,
  index: number,
): { contentType: string; name: string } => {
  if (!value || typeof value !== 'object') {
    throw new AppError(`El archivo ${index + 1} no tiene un descriptor válido.`);
  }

  const descriptor = value as { contentType?: unknown; name?: unknown };
  const fileName = String(descriptor.name ?? '').trim();

  if (!fileName) {
    throw new AppError(`El archivo ${index + 1} no tiene nombre válido.`);
  }

  return {
    contentType: String(descriptor.contentType ?? 'application/octet-stream'),
    name: fileName,
  };
};

export const getStorageConfig: RequestHandler = (_req, res) => {
  res.json({
    directUpload: env.storageDriver === 's3',
    driver: env.storageDriver,
    maxFileSizeMb: env.uploadMaxFileSizeMb,
  });
};

export const postPresignUploads: RequestHandler = async (req, res) => {
  const folder = parseFolder(req.body.folder);
  const files = Array.isArray(req.body.files) ? (req.body.files as unknown[]) : [];

  if (files.length === 0) {
    throw new AppError('Debes indicar al menos un archivo para firmar.');
  }

  const uploads = await createDirectUploadTargets(
    folder,
    files.map((file: unknown, index: number) => parseUploadDescriptor(file, index)),
  );

  res.status(201).json({ uploads });
};
