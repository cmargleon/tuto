import type { RequestHandler } from 'express';
import { createModel, deleteModel, listModels, updateModel } from '../services/modelService';
import { AppError } from '../utils/appError';

export const getModels: RequestHandler = (_req, res) => {
  res.json(listModels());
};

export const postModel: RequestHandler = (req, res) => {
  const clientId = Number(req.body.clientId);
  const files = Array.isArray(req.files) ? req.files : [];
  const model = createModel({
    clientId,
    name: String(req.body.name ?? ''),
    files,
  });
  res.status(201).json(model);
};

export const putModel: RequestHandler = (req, res) => {
  const modelId = Number(req.params.id);

  if (!Number.isInteger(modelId)) {
    throw new AppError('Id de modelo inválido.');
  }

  const model = updateModel(modelId, {
    clientId: Number(req.body.clientId),
    name: String(req.body.name ?? ''),
  });
  res.json(model);
};

export const deleteModelById: RequestHandler = (req, res) => {
  const modelId = Number(req.params.id);

  if (!Number.isInteger(modelId)) {
    throw new AppError('Id de modelo inválido.');
  }

  deleteModel(modelId);
  res.status(204).send();
};
