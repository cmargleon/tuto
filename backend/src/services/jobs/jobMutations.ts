import { db } from '../../db';
import { deleteStoredFile } from '../../storage/fileStorage';
import type { JobRecord, ProviderKey } from '@tuto/shared';
import type { RegenerateJobInput } from '../../types/domain';
import { AppError } from '../../utils/appError';
import { isProviderKey } from '../../utils/providerCatalog';
import { getJobById } from './jobQueries';

const persistCompletedJobOutput = db.transaction(
  (
    jobId: number,
    output: { provider: ProviderKey; prompt: string; resultImage: string },
  ): { outputId: number; previousImagePaths: string[] } => {
    const previousOutputs = db
      .prepare('SELECT id, result_image FROM job_outputs WHERE job_id = ? ORDER BY created_at ASC, id ASC')
      .all(jobId) as Array<{ id: number; result_image: string }>;
    const outputResult = db
      .prepare('INSERT INTO job_outputs (job_id, provider, prompt, result_image) VALUES (?, ?, ?, ?)')
      .run(jobId, output.provider, output.prompt, output.resultImage);

    const outputId = Number(outputResult.lastInsertRowid);

    db.prepare(
      "UPDATE jobs SET status = 'completed', provider = ?, current_output_id = ?, queue_priority = 0, started_at = NULL, completed_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).run(output.provider, outputId, jobId);

    if (previousOutputs.length > 0) {
      const deletePreviousOutput = db.prepare('DELETE FROM job_outputs WHERE id = ?');

      previousOutputs.forEach((previousOutput) => {
        deletePreviousOutput.run(previousOutput.id);
      });
    }

    return {
      outputId,
      previousImagePaths: previousOutputs.map((row) => row.result_image),
    };
  },
);

export const completeJob = async (
  jobId: number,
  output: { provider: ProviderKey; prompt: string; resultImage: string },
): Promise<number> => {
  const { outputId, previousImagePaths } = persistCompletedJobOutput(jobId, output);

  await Promise.allSettled(previousImagePaths.map((imagePath) => deleteStoredFile(imagePath)));

  return outputId;
};

export const failJob = (jobId: number): void => {
  db.prepare("UPDATE jobs SET status = 'failed', queue_priority = 0, started_at = NULL WHERE id = ?").run(jobId);
};

export const retryOrFailJob = (jobId: number, maxRetries: number): void => {
  const row = db.prepare('SELECT retry_count FROM jobs WHERE id = ?').get(jobId) as
    | { retry_count: number }
    | undefined;

  if (!row) {
    return;
  }

  if (row.retry_count < maxRetries) {
    db.prepare(
      "UPDATE jobs SET status = 'pending', queue_priority = 0, retry_count = retry_count + 1, started_at = NULL WHERE id = ?",
    ).run(jobId);
  } else {
    db.prepare("UPDATE jobs SET status = 'failed', queue_priority = 0, started_at = NULL WHERE id = ?").run(jobId);
  }
};

export const queueJobRegeneration = (input: RegenerateJobInput): JobRecord => {
  const existingJob = getJobById(input.jobId);

  if (!existingJob) {
    throw new AppError('Trabajo no encontrado.', 404);
  }

  if (!isProviderKey(input.provider)) {
    throw new AppError('Se seleccionó un proveedor no compatible.');
  }

  if (existingJob.status === 'processing') {
    throw new AppError('Este trabajo ya se está procesando. Espera a que termine antes de regenerarlo.');
  }

  db.prepare(
    "UPDATE jobs SET provider = ?, prompt = ?, status = 'pending', queue_priority = 1, retry_count = 0, started_at = NULL WHERE id = ?",
  ).run(input.provider, input.prompt.trim() || existingJob.prompt, input.jobId);

  const updatedJob = getJobById(input.jobId);

  if (!updatedJob) {
    throw new AppError('No se pudo cargar el trabajo actualizado.', 500);
  }

  return updatedJob;
};

export const addJobLog = (jobId: number, providerResponse: unknown, outputId: number | null = null): void => {
  const payload = typeof providerResponse === 'string' ? providerResponse : JSON.stringify(providerResponse, null, 2);
  db.prepare('INSERT INTO job_logs (job_id, output_id, provider_response) VALUES (?, ?, ?)').run(jobId, outputId, payload);
};
