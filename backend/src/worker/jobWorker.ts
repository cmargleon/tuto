import { buildGenerationPrompt } from '../background/promptBuilders';
import { publicUploadPathToAbsolutePath } from '../storage/fileStorage';
import { getImageProvider } from '../providers/providerFactory';
import { addJobLog, claimNextPendingJob, completeJob, failJob, requeueProcessingJobs } from '../services/jobService';

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
    const result = await provider.generate({
      poseImagePath: publicUploadPathToAbsolutePath(job.poseImagePath),
      garmentImagePath: publicUploadPathToAbsolutePath(job.garmentFilePath),
      prompt: finalPrompt,
      aspectRatio: job.aspectRatio,
    });

    const outputId = completeJob(job.id, {
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
  } catch (error) {
    failJob(job.id);
    addJobLog(job.id, {
      provider: job.provider,
      aspectRatio: job.aspectRatio,
      finalPrompt: job.prompt,
      error: serializeError(error),
    });
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
