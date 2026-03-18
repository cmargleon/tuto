import type { RequestHandler } from 'express';
import { getAssetRedirectUrl, isManagedStoragePath } from '../storage/fileStorage';
import { AppError } from '../utils/appError';

export const getAsset: RequestHandler = async (req, res) => {
  const assetPath = String(req.query.path ?? '');

  if (!assetPath) {
    throw new AppError('Se requiere la ruta del archivo para resolver el asset.');
  }

  if (!isManagedStoragePath(assetPath)) {
    throw new AppError('La ruta solicitada no pertenece a un asset válido.', 400);
  }

  const redirectUrl = await getAssetRedirectUrl(assetPath);

  res.setHeader('Cache-Control', 'private, max-age=60');
  res.redirect(302, redirectUrl);
};
