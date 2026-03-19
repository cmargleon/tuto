import path from 'node:path';
import type { RequestHandler } from 'express';
import { getAssetRedirectUrl, isManagedStoragePath, materializeStoredFile } from '../storage/fileStorage';
import { AppError } from '../utils/appError';

export const getAsset: RequestHandler = async (req, res) => {
  const assetPath = String(req.query.path ?? '');

  if (!assetPath) {
    throw new AppError('Se requiere la ruta del archivo para resolver el asset.');
  }

  if (!isManagedStoragePath(assetPath)) {
    throw new AppError('La ruta solicitada no pertenece a un asset válido.', 400);
  }

  // proxy=1: stream content through backend instead of redirecting.
  // Required when the browser needs to read the response body (e.g. zip downloads)
  // because fetch() following a 302 to S3 triggers CORS restrictions.
  if (req.query.proxy === '1') {
    const { localPath, cleanup } = await materializeStoredFile(assetPath);

    res.setHeader('Cache-Control', 'private, max-age=300');
    res.sendFile(path.resolve(localPath), (err) => {
      void cleanup();

      if (err && !res.headersSent) {
        res.status(500).json({ message: 'Error al enviar el archivo.' });
      }
    });

    return;
  }

  const redirectUrl = await getAssetRedirectUrl(assetPath);

  res.setHeader('Cache-Control', 'private, max-age=60');
  res.redirect(302, redirectUrl);
};
