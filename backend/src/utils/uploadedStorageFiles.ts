import {
  deleteStoredFile,
  isAllowedStoragePathForFolder,
  storeUploadedFile,
  type ClientUploadFolder,
} from '../storage/fileStorage';
import type { UploadedStorageFileRecord } from '../types/domain';
import { AppError } from './appError';

interface ParseUploadedStorageFilesOptions {
  folder: ClientUploadFolder;
  invalidCollectionMessage: string;
  invalidItemMessage: (index: number) => string;
}

export const parseUploadedStorageFiles = (
  value: unknown,
  options: ParseUploadedStorageFilesOptions,
): UploadedStorageFileRecord[] => {
  if (!value) {
    return [];
  }

  let parsedValue: unknown;

  try {
    parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    throw new AppError(options.invalidCollectionMessage);
  }

  if (!Array.isArray(parsedValue)) {
    return [];
  }

  return parsedValue.map((entry, index) => {
    const originalName = String((entry as { originalName?: unknown } | null)?.originalName ?? '').trim();
    const storagePath = String((entry as { storagePath?: unknown } | null)?.storagePath ?? '').trim();

    if (!originalName || !storagePath || !isAllowedStoragePathForFolder(storagePath, options.folder)) {
      throw new AppError(options.invalidItemMessage(index));
    }

    return {
      originalName,
      storagePath,
    };
  });
};

export const storeMultipartUploadedFiles = async (
  files: Express.Multer.File[],
  folder: ClientUploadFolder,
): Promise<UploadedStorageFileRecord[]> =>
  Promise.all(
    files.map(async (file) => {
      const storedFile = await storeUploadedFile(file, folder);

      return {
        originalName: file.originalname,
        storagePath: storedFile.storagePath,
      };
    }),
  );

export const normalizeUploadedStorageFiles = async (input: {
  files: Express.Multer.File[];
  folder: ClientUploadFolder;
  invalidCollectionMessage: string;
  invalidItemMessage: (index: number) => string;
  rawValue: unknown;
}): Promise<UploadedStorageFileRecord[]> => {
  const uploadedFilesFromBody = parseUploadedStorageFiles(input.rawValue, {
    folder: input.folder,
    invalidCollectionMessage: input.invalidCollectionMessage,
    invalidItemMessage: input.invalidItemMessage,
  });
  const uploadedFilesFromMultipart = await storeMultipartUploadedFiles(input.files, input.folder);

  return [...uploadedFilesFromBody, ...uploadedFilesFromMultipart];
};

export const cleanupUploadedStorageFiles = async (files: UploadedStorageFileRecord[]): Promise<void> => {
  await Promise.allSettled(files.map((file) => deleteStoredFile(file.storagePath)));
};
