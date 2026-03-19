import type { RequestHandler } from 'express';
import { env } from '../config/env';
import {
  createDirectUploadTargets,
  deleteStoredFile,
  isAllowedStoragePathForFolder,
  validateDirectUploadCors,
  type ClientUploadFolder,
} from '../storage/fileStorage';
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

  await validateDirectUploadCors(req.get('origin') ?? null);

  const uploads = await createDirectUploadTargets(
    folder,
    files.map((file: unknown, index: number) => parseUploadDescriptor(file, index)),
  );

  res.status(201).json({ uploads });
};

export const postCleanupUploads: RequestHandler = async (req, res) => {
  const folder = parseFolder(req.body.folder);
  const paths = Array.isArray(req.body.paths) ? (req.body.paths as unknown[]) : [];

  if (paths.length === 0) {
    res.status(204).send();
    return;
  }

  const normalizedPaths = paths.map((value, index) => {
    const storagePath = String(value ?? '').trim();

    if (!storagePath || !isAllowedStoragePathForFolder(storagePath, folder)) {
      throw new AppError(`La ruta de cleanup ${index + 1} no es válida para ${folder}.`);
    }

    return storagePath;
  });

  await Promise.allSettled(normalizedPaths.map((storagePath) => deleteStoredFile(storagePath)));
  res.status(204).send();
};
