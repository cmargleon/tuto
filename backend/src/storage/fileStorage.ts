import fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import mime from 'mime-types';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

export type UploadFolder = 'models' | 'garments' | 'generated';

export interface StoredFileResult {
  absolutePath: string;
  publicPath: string;
}

const imageMimePattern = /^image\/(png|jpeg|jpg|webp|gif)$/i;

const ensureFolder = (folder: UploadFolder): string => {
  const absoluteFolderPath = path.resolve(env.uploadRoot, folder);
  fs.mkdirSync(absoluteFolderPath, { recursive: true });
  return absoluteFolderPath;
};

const buildStoredFilename = (originalName: string, fallbackExtension = '.png'): string => {
  const sourceExtension = path.extname(originalName).toLowerCase();
  const safeExtension = sourceExtension || fallbackExtension;
  return `${uuidv4()}${safeExtension}`;
};

export const ensureStorageFolders = (): void => {
  ensureFolder('models');
  ensureFolder('garments');
  ensureFolder('generated');
};

export const toPublicUploadPath = (folder: UploadFolder, filename: string): string =>
  `/uploads/${folder}/${filename}`;

export const publicUploadPathToAbsolutePath = (publicPath: string): string => {
  const relativePath = publicPath.replace(/^\/uploads\//, '');
  return path.resolve(env.uploadRoot, relativePath);
};

const imageOnlyFilter: multer.Options['fileFilter'] = (_req, file, callback) => {
  if (!imageMimePattern.test(file.mimetype)) {
    callback(new Error('Solo se admiten imágenes PNG, JPG, JPEG, WEBP y GIF.'));
    return;
  }

  callback(null, true);
};

export const createImageUpload = (folder: Exclude<UploadFolder, 'generated'>): multer.Multer =>
  multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => {
        callback(null, ensureFolder(folder));
      },
      filename: (_req, file, callback) => {
        callback(null, buildStoredFilename(file.originalname));
      },
    }),
    fileFilter: imageOnlyFilter,
  });

export const downloadRemoteImage = async (imageUrl: string, folder: UploadFolder = 'generated'): Promise<StoredFileResult> => {
  const response = await axios.get(imageUrl, {
    responseType: 'stream',
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
  const extension = extensionFromUrl || (extensionFromMime ? `.${extensionFromMime}` : '.png');
  const filename = `${uuidv4()}${extension}`;
  const absolutePath = path.resolve(ensureFolder(folder), filename);

  await new Promise<void>((resolve, reject) => {
    const writer = fs.createWriteStream(absolutePath);

    response.data.pipe(writer);
    writer.on('finish', () => resolve());
    writer.on('error', reject);
    response.data.on('error', reject);
  });

  return {
    absolutePath,
    publicPath: toPublicUploadPath(folder, filename),
  };
};

export const saveBase64Image = async (
  base64Image: string,
  folder: UploadFolder = 'generated',
  extension = 'png',
): Promise<StoredFileResult> => {
  const filename = `${uuidv4()}.${extension.replace(/^\./, '')}`;
  const absolutePath = path.resolve(ensureFolder(folder), filename);

  await fs.promises.writeFile(absolutePath, Buffer.from(base64Image, 'base64'));

  return {
    absolutePath,
    publicPath: toPublicUploadPath(folder, filename),
  };
};
