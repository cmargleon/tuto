import { cleanupDirectUploads, requestPresignedUploads } from '../../services/api';
import type { StorageConfig, UploadedStorageFileRecord } from '../../types/api';

const validateFileSizes = (storageConfig: StorageConfig | null, files: File[]): void => {
  if (!storageConfig || files.length === 0) {
    return;
  }

  const maxFileSizeBytes = storageConfig.maxFileSizeMb * 1024 * 1024;
  const oversizedFiles = files.filter((file) => file.size > maxFileSizeBytes);

  if (oversizedFiles.length === 0) {
    return;
  }

  const listedFiles = oversizedFiles.map((file) => file.name).join(', ');
  throw new Error(
    `Los siguientes archivos superan el límite de ${storageConfig.maxFileSizeMb} MB: ${listedFiles}. Reduce su tamaño antes de continuar.`,
  );
};

const buildFallbackReason = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
      return 'El navegador no pudo subir directo a S3. Probablemente hay un problema de CORS o de conectividad.';
    }

    return error.message;
  }

  return 'La subida directa a S3 falló por una causa no identificada.';
};

export const uploadFilesToStorage = async (
  storageConfig: StorageConfig | null,
  folder: 'models' | 'garments',
  files: File[],
): Promise<UploadedStorageFileRecord[] | undefined> => {
  validateFileSizes(storageConfig, files);

  if (!storageConfig?.directUpload || files.length === 0) {
    return undefined;
  }

  let uploadPathsForCleanup: string[] = [];

  try {
    const uploads = await requestPresignedUploads(folder, files);
    uploadPathsForCleanup = uploads.map((upload) => upload.storagePath);

    await Promise.all(
      uploads.map(async (upload, index) => {
        const file = files[index];
        const response = await fetch(upload.uploadUrl, {
          method: 'PUT',
          headers: upload.headers,
          body: file,
        });

        if (!response.ok) {
          throw new Error(
            `S3 rechazó la subida de ${file.name} con estado ${response.status}. Se usará el backend como fallback.`,
          );
        }
      }),
    );

    return uploads.map((upload, index) => ({
      originalName: files[index]?.name ?? `archivo-${index + 1}`,
      storagePath: upload.storagePath,
    }));
  } catch (error) {
    const fallbackReason = buildFallbackReason(error);

    try {
      await cleanupDirectUploads(folder, uploadPathsForCleanup);
    } catch (cleanupError) {
      console.warn('[storage] No se pudieron limpiar los archivos temporales de una subida directa fallida.', cleanupError);
    }

    console.warn(`[storage] ${fallbackReason} Se usará el backend como fallback.`, error);
    return undefined;
  }
};
