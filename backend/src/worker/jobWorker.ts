import { buildGenerationPrompt } from '../background/promptBuilders';
import { env } from '../config/env';
import { materializeStoredFile } from '../storage/fileStorage';
import { getImageProvider } from '../providers/providerFactory';
import { logger } from '../utils/logger';
import {
  addJobLog,
  claimNextPendingJob,
  completeJob,
  requeueProcessingJobs,
  requeueStuckJobs,
  retryOrFailJob,
} from '../services/jobService';

let timer: NodeJS.Timeout | null = null;
let running = false;

const serializeError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return {
      message: 'Error desconocido del proceso en segundo plano',
      raw: error,
    };
  }

  const cause = (error as Error & { cause?: unknown }).cause;

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause:
      cause instanceof Error
        ? {
            name: cause.name,
            message: cause.message,
            stack: cause.stack,
          }
        : cause ?? null,
  };
};

const processNextJob = async (): Promise<void> => {
  const stuck = requeueStuckJobs(env.workerJobTimeoutMs);
  if (stuck > 0) {
    logger.warn({ count: stuck, timeoutMs: env.workerJobTimeoutMs }, 'worker: jobs stuck detectados y re-encolados');
  }

  if (running) {
    return;
  }

  const job = claimNextPendingJob();

  if (!job) {
    return;
  }

  running = true;

  try {
    const provider = getImageProvider(job.provider);
    const finalPrompt = buildGenerationPrompt(job.prompt, job.backgroundConfig);
    let poseImage: Awaited<ReturnType<typeof materializeStoredFile>> | null = null;
    let garmentImage: Awaited<ReturnType<typeof materializeStoredFile>> | null = null;

    try {
      poseImage = await materializeStoredFile(job.poseImagePath);
      garmentImage = await materializeStoredFile(job.garmentFilePath);
      const result = await provider.generate({
        poseImagePath: poseImage.localPath,
        garmentImagePath: garmentImage.localPath,
        prompt: finalPrompt,
        aspectRatio: job.aspectRatio,
      });

      const outputId = await completeJob(job.id, {
        provider: result.provider,
        prompt: finalPrompt,
        resultImage: result.localFilePath,
      });

      addJobLog(
        job.id,
        {
          provider: result.provider,
          aspectRatio: job.aspectRatio,
          backgroundConfig: job.backgroundConfig,
          finalPrompt,
          remoteUrl: result.remoteUrl,
          rawResponse: result.rawResponse,
        },
        outputId,
      );
    } finally {
      const cleanupTasks: Array<Promise<void>> = [];

      if (poseImage) {
        cleanupTasks.push(poseImage.cleanup());
      }

      if (garmentImage) {
        cleanupTasks.push(garmentImage.cleanup());
      }

      await Promise.allSettled(cleanupTasks);
    }
  } catch (error) {
    retryOrFailJob(job.id, env.workerMaxRetries);
    addJobLog(job.id, {
      provider: job.provider,
      aspectRatio: job.aspectRatio,
      finalPrompt: job.prompt,
      error: serializeError(error),
    });
    logger.error({ jobId: job.id, provider: job.provider, err: serializeError(error) }, 'worker: job falló');
  } finally {
    running = false;
  }
};

export const startJobWorker = (intervalMs: number): void => {
  if (timer) {
    return;
  }

  requeueProcessingJobs();

  timer = setInterval(() => {
    void processNextJob();
  }, intervalMs);

  void processNextJob();
};

export const stopJobWorker = (): void => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};
