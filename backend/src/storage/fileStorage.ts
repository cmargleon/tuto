import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import axios from 'axios';
import {
  DeleteObjectCommand,
  GetBucketCorsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import mime from 'mime-types';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import { AppError } from '../utils/appError';

export type UploadFolder = 'models' | 'garments' | 'generated';
export type ClientUploadFolder = Exclude<UploadFolder, 'generated'>;

export interface StoredFileResult {
  storagePath: string;
}

export interface DirectUploadFileInput {
  contentType: string;
  name: string;
}

export interface DirectUploadTarget {
  headers: Record<string, string>;
  storagePath: string;
  uploadUrl: string;
}

export interface MaterializedFile {
  cleanup: () => Promise<void>;
  localPath: string;
}

const imageMimePattern = /^image\/(png|jpeg|jpg|webp|gif)$/i;
const localUploadPrefix = '/uploads/';
const storageTempRoot = path.resolve(os.tmpdir(), 'tuto-storage');

let s3Client: S3Client | null = null;

const ensureFolder = (folder: UploadFolder): string => {
  const absoluteFolderPath = path.resolve(env.uploadRoot, folder);
  fs.mkdirSync(absoluteFolderPath, { recursive: true });
  return absoluteFolderPath;
};

const ensureStorageTempFolder = (): string => {
  fs.mkdirSync(storageTempRoot, { recursive: true });
  return storageTempRoot;
};

const buildStoredFilename = (originalName: string, fallbackExtension = '.png'): string => {
  const sourceExtension = path.extname(originalName).toLowerCase();
  const safeExtension = sourceExtension || fallbackExtension;
  return `${uuidv4()}${safeExtension}`;
};

const isHttpUrl = (value: string): boolean => value.startsWith('http://') || value.startsWith('https://');

const isLocalUploadPath = (value: string): boolean => value.startsWith(localUploadPrefix);

const isS3StoragePath = (value: string): boolean => value.startsWith('s3://');

const buildS3ObjectKey = (folder: UploadFolder, filename: string): string => {
  const pathParts = [env.awsS3Prefix, folder, filename].filter(Boolean);
  return pathParts.join('/');
};

const buildFolderPrefix = (folder: UploadFolder): string => {
  const pathParts = [env.awsS3Prefix, folder].filter(Boolean);
  return `${pathParts.join('/')}/`;
};

const isWildcardMatch = (value: string, pattern: string): boolean => {
  if (pattern === '*') {
    return true;
  }

  const escapedPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escapedPattern}$`).test(value);
};

const buildLocalUploadPath = (folder: UploadFolder, filename: string): string => `${localUploadPrefix}${folder}/${filename}`;

const parseLocalUploadPath = (storagePath: string): { absolutePath: string; relativePath: string } => {
  const relativePath = storagePath.replace(/^\/uploads\//, '');
  return {
    absolutePath: path.resolve(env.uploadRoot, relativePath),
    relativePath,
  };
};

const getUploadFolderFromLocalPath = (storagePath: string): UploadFolder => {
  const { relativePath } = parseLocalUploadPath(storagePath);
  const folder = relativePath.split('/')[0];

  if (folder === 'models' || folder === 'garments' || folder === 'generated') {
    return folder;
  }

  throw new AppError('La ruta local no pertenece a una carpeta de uploads soportada.', 500);
};

const parseS3StoragePath = (storagePath: string): { bucket: string; key: string } => {
  const withoutProtocol = storagePath.replace(/^s3:\/\//, '');
  const slashIndex = withoutProtocol.indexOf('/');

  if (slashIndex <= 0) {
    throw new AppError('La ruta S3 almacenada no es válida.', 500);
  }

  return {
    bucket: withoutProtocol.slice(0, slashIndex),
    key: withoutProtocol.slice(slashIndex + 1),
  };
};

const getS3Client = (): S3Client => {
  if (s3Client) {
    return s3Client;
  }

  if (!env.awsRegion) {
    throw new AppError('AWS_REGION no está configurada para usar almacenamiento en S3.', 500);
  }

  if (!env.awsS3Bucket) {
    throw new AppError('AWS_S3_BUCKET no está configurado para usar almacenamiento en S3.', 500);
  }

  s3Client = new S3Client({
    region: env.awsRegion,
    endpoint: env.awsS3Endpoint || undefined,
    forcePathStyle: env.awsS3ForcePathStyle,
  });

  return s3Client;
};

const storeBufferLocally = async (
  buffer: Buffer,
  folder: UploadFolder,
  filename: string,
): Promise<StoredFileResult> => {
  const absolutePath = path.resolve(ensureFolder(folder), filename);
  await fs.promises.writeFile(absolutePath, buffer);
  return {
    storagePath: buildLocalUploadPath(folder, filename),
  };
};

const storeBufferInS3 = async (
  buffer: Buffer,
  folder: UploadFolder,
  filename: string,
  contentType: string | null,
): Promise<StoredFileResult> => {
  const key = buildS3ObjectKey(folder, filename);

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.awsS3Bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType ?? undefined,
    }),
  );

  return {
    storagePath: `s3://${env.awsS3Bucket}/${key}`,
  };
};

const storeBuffer = async (input: {
  buffer: Buffer;
  contentType?: string | null;
  fallbackExtension?: string;
  folder: UploadFolder;
  originalName: string;
}): Promise<StoredFileResult> => {
  const filename = buildStoredFilename(input.originalName, input.fallbackExtension);

  if (env.storageDriver === 's3') {
    return storeBufferInS3(input.buffer, input.folder, filename, input.contentType ?? null);
  }

  return storeBufferLocally(input.buffer, input.folder, filename);
};

const streamBodyToBuffer = async (body: unknown): Promise<Buffer> => {
  if (!body || typeof body !== 'object' || !('transformToByteArray' in body)) {
    throw new AppError('No se pudo leer el archivo almacenado en S3.', 500);
  }

  const byteArray = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
  return Buffer.from(byteArray);
};

const imageOnlyFilter: multer.Options['fileFilter'] = (_req, file, callback) => {
  if (!imageMimePattern.test(file.mimetype)) {
    callback(new Error('Solo se admiten imágenes PNG, JPG, JPEG, WEBP y GIF.'));
    return;
  }

  callback(null, true);
};

export const ensureStorageFolders = (): void => {
  if (env.storageDriver === 'local') {
    ensureFolder('models');
    ensureFolder('garments');
    ensureFolder('generated');
  } else {
    getS3Client();
  }

  ensureStorageTempFolder();
};

export const createImageUpload = (): multer.Multer =>
  multer({
    limits: {
      fileSize: env.uploadMaxFileSizeMb * 1024 * 1024,
    },
    storage: multer.memoryStorage(),
    fileFilter: imageOnlyFilter,
  });

export const storeUploadedFile = async (
  file: Express.Multer.File,
  folder: UploadFolder,
): Promise<StoredFileResult> => {
  if (!file.buffer || file.buffer.length === 0) {
    throw new AppError('El archivo subido no contiene datos válidos.', 400);
  }

  return storeBuffer({
    buffer: file.buffer,
    contentType: file.mimetype,
    folder,
    originalName: file.originalname,
  });
};

export const createDirectUploadTargets = async (
  folder: ClientUploadFolder,
  files: DirectUploadFileInput[],
): Promise<DirectUploadTarget[]> => {
  if (env.storageDriver !== 's3') {
    throw new AppError('Las subidas directas solo están disponibles cuando STORAGE_DRIVER=s3.', 409);
  }

  return Promise.all(
    files.map(async (file) => {
      const filename = buildStoredFilename(file.name);
      const key = buildS3ObjectKey(folder, filename);
      const storagePath = `s3://${env.awsS3Bucket}/${key}`;
      const headers: Record<string, string> = {};

      if (file.contentType) {
        headers['Content-Type'] = file.contentType;
      }

      const uploadUrl = await getSignedUrl(
        getS3Client(),
        new PutObjectCommand({
          Bucket: env.awsS3Bucket,
          Key: key,
          ContentType: file.contentType || undefined,
        }),
        {
          expiresIn: env.awsS3SignedUrlTtlSeconds,
        },
      );

      return {
        headers,
        storagePath,
        uploadUrl,
      };
    }),
  );
};

export const validateDirectUploadCors = async (origin: string | null): Promise<void> => {
  if (env.storageDriver !== 's3' || !origin) {
    return;
  }

  try {
    const response = await getS3Client().send(
      new GetBucketCorsCommand({
        Bucket: env.awsS3Bucket,
      }),
    );
    const corsRules = response.CORSRules ?? [];
    const allowsOrigin = corsRules.some((rule) => {
      const allowedOrigins = rule.AllowedOrigins ?? [];
      const allowedMethods = rule.AllowedMethods ?? [];
      const allowedHeaders = rule.AllowedHeaders ?? [];

      const originAllowed = allowedOrigins.some((allowedOrigin) => isWildcardMatch(origin, allowedOrigin));
      const putAllowed = allowedMethods.some((method) => method.toUpperCase() === 'PUT');
      const contentTypeHeaderAllowed =
        allowedHeaders.length === 0 ||
        allowedHeaders.some((header) => header === '*' || header.toLowerCase() === 'content-type');

      return originAllowed && putAllowed && contentTypeHeaderAllowed;
    });

    if (!allowsOrigin) {
      throw new AppError(
        `El bucket S3 no permite subidas directas desde ${origin}. Revisa la configuración CORS para permitir PUT y el header Content-Type.`,
        409,
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const errorName = (error as { name?: string } | null)?.name;

    if (errorName === 'NoSuchCORSConfiguration') {
      throw new AppError('El bucket S3 no tiene reglas CORS configuradas para subidas directas desde el navegador.', 409);
    }

    throw new AppError('No se pudo validar la configuración CORS del bucket S3 para subidas directas.', 409);
  }
};

export const downloadRemoteImage = async (imageUrl: string, folder: UploadFolder = 'generated'): Promise<StoredFileResult> => {
  const response = await axios.get<ArrayBuffer>(imageUrl, {
    responseType: 'arraybuffer',
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  const contentType = String(response.headers['content-type'] ?? '');
  const urlPathname = (() => {
    try {
      return new URL(imageUrl).pathname;
    } catch {
      return '';
    }
  })();

  const extensionFromUrl = path.extname(urlPathname);
  const extensionFromMime = mime.extension(contentType);
  const fallbackExtension = extensionFromUrl || (extensionFromMime ? `.${extensionFromMime}` : '.png');

  return storeBuffer({
    buffer: Buffer.from(response.data),
    contentType,
    fallbackExtension,
    folder,
    originalName: path.basename(urlPathname) || `remote-image${fallbackExtension}`,
  });
};

export const saveBase64Image = async (
  base64Image: string,
  folder: UploadFolder = 'generated',
  extension = 'png',
): Promise<StoredFileResult> =>
  storeBuffer({
    buffer: Buffer.from(base64Image, 'base64'),
    contentType: mime.lookup(extension.replace(/^\./, '')) || 'image/png',
    fallbackExtension: `.${extension.replace(/^\./, '')}`,
    folder,
    originalName: `generated.${extension.replace(/^\./, '')}`,
  });

export const deleteStoredFile = async (storagePath: string): Promise<void> => {
  if (isLocalUploadPath(storagePath)) {
    const { absolutePath } = parseLocalUploadPath(storagePath);
    await fs.promises.rm(absolutePath, { force: true });
    return;
  }

  if (isS3StoragePath(storagePath)) {
    const { bucket, key } = parseS3StoragePath(storagePath);

    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }
};

export const migrateLocalFileToS3 = async (storagePath: string): Promise<string> => {
  if (!isLocalUploadPath(storagePath)) {
    return storagePath;
  }

  if (env.storageDriver !== 's3') {
    throw new AppError('La migración a S3 requiere STORAGE_DRIVER=s3.', 500);
  }

  const { absolutePath } = parseLocalUploadPath(storagePath);
  const folder = getUploadFolderFromLocalPath(storagePath);
  const filename = path.basename(absolutePath);
  const fileBuffer = await fs.promises.readFile(absolutePath);
  const contentType = mime.lookup(filename) || 'application/octet-stream';
  const storedFile = await storeBufferInS3(fileBuffer, folder, filename, String(contentType));

  return storedFile.storagePath;
};

export const materializeStoredFile = async (storagePath: string): Promise<MaterializedFile> => {
  if (isLocalUploadPath(storagePath)) {
    const { absolutePath } = parseLocalUploadPath(storagePath);

    return {
      cleanup: async () => undefined,
      localPath: absolutePath,
    };
  }

  if (isS3StoragePath(storagePath)) {
    const { bucket, key } = parseS3StoragePath(storagePath);
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    const buffer = await streamBodyToBuffer(response.Body);
    const extension = path.extname(key) || '.png';
    const tempFilename = `${uuidv4()}${extension}`;
    const tempPath = path.resolve(ensureStorageTempFolder(), tempFilename);

    await fs.promises.writeFile(tempPath, buffer);

    return {
      cleanup: async () => {
        await fs.promises.rm(tempPath, { force: true });
      },
      localPath: tempPath,
    };
  }

  if (isHttpUrl(storagePath)) {
    const storedImage = await downloadRemoteImage(storagePath, 'generated');
    return materializeStoredFile(storedImage.storagePath);
  }

  throw new AppError('La ruta del archivo almacenado no es compatible.', 500);
};

export const getAssetRedirectUrl = async (storagePath: string): Promise<string> => {
  if (isHttpUrl(storagePath)) {
    return storagePath;
  }

  if (isLocalUploadPath(storagePath)) {
    return storagePath;
  }

  if (isS3StoragePath(storagePath)) {
    const { bucket, key } = parseS3StoragePath(storagePath);

    return getSignedUrl(
      getS3Client(),
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
      {
        expiresIn: env.awsS3SignedUrlTtlSeconds,
      },
    );
  }

  throw new AppError('La ruta solicitada no pertenece a un archivo válido.', 400);
};

export const isManagedStoragePath = (storagePath: string): boolean =>
  isLocalUploadPath(storagePath) || isS3StoragePath(storagePath) || isHttpUrl(storagePath);

export const isAllowedStoragePathForFolder = (storagePath: string, folder: UploadFolder): boolean => {
  if (isLocalUploadPath(storagePath)) {
    return storagePath.startsWith(buildLocalUploadPath(folder, ''));
  }

  if (isS3StoragePath(storagePath)) {
    const { bucket, key } = parseS3StoragePath(storagePath);
    return bucket === env.awsS3Bucket && key.startsWith(buildFolderPrefix(folder));
  }

  return false;
};
