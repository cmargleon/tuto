import { db } from '../db';
import { normalizeBackgroundConfig } from '../background/config';
import { DEFAULT_TRY_ON_PROMPT } from '../constants/tryOn';
import { env } from '../config/env';
import { isAspectRatioKey, type GenerateJobsInput } from '../types/domain';
import { getClientById } from './clientService';
import { getModelById } from './modelService';
import { AppError } from '../utils/appError';
import { isProviderKey } from '../utils/providerCatalog';

const defaultTryOnPrompt = DEFAULT_TRY_ON_PROMPT;

export const createGenerationJobs = (input: GenerateJobsInput): { createdJobs: number } => {
  if (!isProviderKey(input.provider)) {
    throw new AppError('Se seleccionó un proveedor no compatible.');
  }

  if (!isAspectRatioKey(input.aspectRatio)) {
    throw new AppError('Se seleccionó una proporción no compatible.');
  }

  const client = getClientById(input.clientId);
  const model = getModelById(input.modelId);

  if (!client) {
    throw new AppError('No se encontró el cliente seleccionado.', 404);
  }

  if (!model) {
    throw new AppError('No se encontró el modelo seleccionado.', 404);
  }

  if (model.clientId !== input.clientId) {
    throw new AppError('El modelo seleccionado no pertenece al cliente elegido.');
  }

  if (input.poseImageIds.length === 0) {
    throw new AppError('Selecciona al menos una imagen de pose.');
  }

  if (input.garments.length === 0) {
    throw new AppError('Sube al menos una prenda.');
  }

  const validPoseIds = new Set(model.images.map((image) => image.id));

  input.poseImageIds.forEach((poseImageId) => {
    if (!validPoseIds.has(poseImageId)) {
      throw new AppError(`La imagen de pose ${poseImageId} no pertenece al modelo seleccionado.`);
    }
  });

  input.garments.forEach((garment, index) => {
    if (!garment.filePath) {
      throw new AppError(`La prenda ${index + 1} no tiene un archivo válido.`);
    }
  });

  const uniquePoseIds = [...new Set(input.poseImageIds)];
  const totalJobs = uniquePoseIds.length * input.garments.length;

  if (totalJobs > env.batchMaxJobs) {
    throw new AppError(
      `El lote excede el límite de ${env.batchMaxJobs} trabajos (${totalJobs} solicitados). Reducí la cantidad de poses o prendas.`,
    );
  }

  const prompt = input.prompt.trim() || defaultTryOnPrompt;
  const backgroundConfig = normalizeBackgroundConfig(input.backgroundConfig);
  const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const insertJob = db.prepare(`
    INSERT INTO jobs (batch_id, client_id, client_name, model_id, pose_image_id, garment_name, garment_file_path, aspect_ratio, provider, prompt, background_config, model_name, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `);

  const insertManyJobs = db.transaction(() => {
    let createdJobs = 0;

    input.garments.forEach((garment) => {
      uniquePoseIds.forEach((poseImageId) => {
        insertJob.run(
          batchId,
          input.clientId,
          client.name,
          input.modelId,
          poseImageId,
          garment.name,
          garment.filePath,
          input.aspectRatio,
          input.provider,
          prompt,
          JSON.stringify(backgroundConfig),
          model.name,
        );
        createdJobs += 1;
      });
    });

    return createdJobs;
  });

  return {
    createdJobs: insertManyJobs(),
  };
};
