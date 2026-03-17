import { db } from '../db';
import type { ModelImageRecord, ModelRecord } from '../types/domain';
import { AppError } from '../utils/appError';
import { toPublicUploadPath } from '../storage/fileStorage';
import { getClientById } from './clientService';

interface DbModelRow {
  id: number;
  client_id: number | null;
  client_name: string | null;
  name: string;
  created_at: string;
}

interface DbModelImageRow {
  id: number;
  model_id: number;
  file_path: string;
  created_at: string;
}

const mapModelImage = (row: DbModelImageRow): ModelImageRecord => ({
  id: row.id,
  modelId: row.model_id,
  filePath: row.file_path,
  createdAt: row.created_at,
});

const mapModel = (row: DbModelRow, images: ModelImageRecord[]): ModelRecord => ({
  id: row.id,
  clientId: row.client_id,
  clientName: row.client_name ?? 'Sin cliente',
  name: row.name,
  createdAt: row.created_at,
  images,
});

export const getModelById = (modelId: number): ModelRecord | null => {
  const modelRow = db
    .prepare(`
      SELECT
        models.id,
        models.client_id,
        clients.name AS client_name,
        models.name,
        models.created_at
      FROM models
      LEFT JOIN clients ON clients.id = models.client_id
      WHERE models.id = ?
    `)
    .get(modelId) as DbModelRow | undefined;

  if (!modelRow) {
    return null;
  }

  const imageRows = db
    .prepare('SELECT id, model_id, file_path, created_at FROM model_images WHERE model_id = ? ORDER BY created_at DESC, id DESC')
    .all(modelId) as DbModelImageRow[];

  return mapModel(modelRow, imageRows.map(mapModelImage));
};

export const listModels = (): ModelRecord[] => {
  const modelRows = db
    .prepare(`
      SELECT
        models.id,
        models.client_id,
        clients.name AS client_name,
        models.name,
        models.created_at
      FROM models
      LEFT JOIN clients ON clients.id = models.client_id
      ORDER BY models.created_at DESC, models.id DESC
    `)
    .all() as DbModelRow[];
  const imageRows = db
    .prepare('SELECT id, model_id, file_path, created_at FROM model_images ORDER BY created_at DESC, id DESC')
    .all() as DbModelImageRow[];

  const imageMap = new Map<number, ModelImageRecord[]>();

  imageRows.forEach((row) => {
    const currentImages = imageMap.get(row.model_id) ?? [];
    currentImages.push(mapModelImage(row));
    imageMap.set(row.model_id, currentImages);
  });

  return modelRows.map((row) => mapModel(row, imageMap.get(row.id) ?? []));
};

interface CreateModelInput {
  clientId: number;
  name: string;
  files: Express.Multer.File[];
}

interface UpdateModelInput {
  clientId: number;
  name: string;
}

export const createModel = (input: CreateModelInput): ModelRecord => {
  const trimmedName = input.name.trim();

  if (!trimmedName) {
    throw new AppError('El nombre del modelo es obligatorio.');
  }

  if (!Number.isInteger(input.clientId)) {
    throw new AppError('Se requiere un cliente válido.');
  }

  if (input.files.length === 0) {
    throw new AppError('Debes subir al menos una imagen de pose antes de guardar el modelo.');
  }

  if (!getClientById(input.clientId)) {
    throw new AppError('Cliente no encontrado.', 404);
  }

  const insertModel = db.prepare('INSERT INTO models (client_id, name) VALUES (?, ?)');
  const insertImage = db.prepare('INSERT INTO model_images (model_id, file_path) VALUES (?, ?)');

  const modelId = db.transaction(() => {
    const result = insertModel.run(input.clientId, trimmedName);
    const createdModelId = Number(result.lastInsertRowid);

    input.files.forEach((file) => {
      insertImage.run(createdModelId, toPublicUploadPath('models', file.filename));
    });

    return createdModelId;
  })();

  const model = getModelById(modelId);

  if (!model) {
    throw new AppError('No se pudo crear el modelo.', 500);
  }

  return model;
};

export const updateModel = (modelId: number, input: UpdateModelInput): ModelRecord => {
  const existingModel = getModelById(modelId);

  if (!existingModel) {
    throw new AppError('Modelo no encontrado.', 404);
  }

  const trimmedName = input.name.trim();

  if (!trimmedName) {
    throw new AppError('El nombre del modelo es obligatorio.');
  }

  if (!Number.isInteger(input.clientId)) {
    throw new AppError('Se requiere un cliente válido.');
  }

  if (!getClientById(input.clientId)) {
    throw new AppError('Cliente no encontrado.', 404);
  }

  db.prepare('UPDATE models SET client_id = ?, name = ? WHERE id = ?').run(input.clientId, trimmedName, modelId);

  const updatedModel = getModelById(modelId);

  if (!updatedModel) {
    throw new AppError('No se pudo cargar el modelo actualizado.', 500);
  }

  return updatedModel;
};

export const deleteModel = (modelId: number): void => {
  const existingModel = getModelById(modelId);

  if (!existingModel) {
    throw new AppError('Modelo no encontrado.', 404);
  }

  db.prepare('DELETE FROM models WHERE id = ?').run(modelId);
};
