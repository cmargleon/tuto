import JSZip from 'jszip';
import type { JobRecord } from '../../types/api';

export interface JobBatch {
  batchId: string;
  clientId: number | null;
  clientName: string;
  modelName: string;
  jobs: JobRecord[];
  latestJobId: number;
  latestCreatedAt: string;
  completedImages: number;
}

export interface GarmentSlide {
  key: string;
  garmentName: string;
  garmentFilePath: string;
  jobs: JobRecord[];
  firstJobId: number;
}

export const getCurrentOutput = (job: JobRecord) => job.currentOutput ?? job.outputs[job.outputs.length - 1] ?? null;

const normalizeTimestamp = (value: string): string => (value.includes('T') ? value : value.replace(' ', 'T'));

export const formatBatchDate = (value: string): string => {
  const parsedDate = new Date(normalizeTimestamp(value));

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate);
};

export const buildJobBatches = (jobs: JobRecord[]): JobBatch[] => {
  const batches = new Map<string, JobBatch>();

  jobs.forEach((job) => {
    const currentBatch = batches.get(job.batchId);

    if (currentBatch) {
      currentBatch.jobs.push(job);
      currentBatch.latestJobId = Math.max(currentBatch.latestJobId, job.id);
      currentBatch.latestCreatedAt = currentBatch.latestCreatedAt > job.createdAt ? currentBatch.latestCreatedAt : job.createdAt;
      currentBatch.completedImages += getCurrentOutput(job) ? 1 : 0;
      return;
    }

    batches.set(job.batchId, {
      batchId: job.batchId,
      clientId: job.clientId,
      clientName: job.clientName,
      modelName: job.modelName,
      jobs: [job],
      latestJobId: job.id,
      latestCreatedAt: job.createdAt,
      completedImages: getCurrentOutput(job) ? 1 : 0,
    });
  });

  return Array.from(batches.values())
    .map((batch) => ({
      ...batch,
      jobs: batch.jobs.slice().sort((leftJob, rightJob) => leftJob.id - rightJob.id),
    }))
    .sort((leftBatch, rightBatch) => rightBatch.latestJobId - leftBatch.latestJobId);
};

export const buildGarmentSlides = (jobs: JobRecord[]): GarmentSlide[] => {
  const slidesByKey = new Map<string, GarmentSlide>();

  jobs
    .slice()
    .sort((leftJob, rightJob) => leftJob.id - rightJob.id)
    .forEach((job) => {
      const slideKey = `${job.garmentFilePath}::${job.garmentName}`;
      const existingSlide = slidesByKey.get(slideKey);

      if (existingSlide) {
        existingSlide.jobs.push(job);
        return;
      }

      slidesByKey.set(slideKey, {
        key: slideKey,
        garmentName: job.garmentName,
        garmentFilePath: job.garmentFilePath,
        jobs: [job],
        firstJobId: job.id,
      });
    });

  return Array.from(slidesByKey.values())
    .map((slide) => ({
      ...slide,
      jobs: slide.jobs.slice().sort((leftJob, rightJob) => leftJob.poseImageId - rightJob.poseImageId || leftJob.id - rightJob.id),
    }))
    .sort((leftSlide, rightSlide) => leftSlide.firstJobId - rightSlide.firstJobId);
};

export const buildBatchLabel = (batch: JobBatch): string =>
  `Trabajo #${batch.latestJobId} · ${formatBatchDate(batch.latestCreatedAt)} · ${batch.completedImages} imagen${batch.completedImages === 1 ? '' : 'es'}`;

const sanitizeFilePart = (value: string): string => {
  const normalizedValue = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const sanitizedValue = normalizedValue.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return sanitizedValue.toLowerCase() || 'imagen';
};

const getFileExtension = (filePath: string): string => {
  const match = filePath.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() ?? 'png';
};

const triggerDownload = (blob: Blob, filename: string): void => {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
};

export const downloadBatchImages = async (batch: JobBatch, resolveDownloadUrl: (path: string | null | undefined) => string): Promise<number> => {
  const jobsWithOutput = batch.jobs.filter((job) => getCurrentOutput(job));

  console.log('[download] total jobs:', batch.jobs.length, '| with output:', jobsWithOutput.length);

  if (jobsWithOutput.length === 0) {
    return 0;
  }

  const zip = new JSZip();

  for (const job of jobsWithOutput) {
    const output = getCurrentOutput(job);

    if (!output) {
      continue;
    }

    const downloadUrl = resolveDownloadUrl(output.resultImage);
    console.log('[download] fetching job', job.id, downloadUrl);

    const response = await fetch(downloadUrl);

    if (!response.ok) {
      throw new Error(`No se pudo descargar la imagen del trabajo #${job.id} (HTTP ${response.status}).`);
    }

    const blob = await response.blob();
    const filename = [
      sanitizeFilePart(batch.clientName || 'cliente'),
      sanitizeFilePart(job.modelName || 'modelo'),
      sanitizeFilePart(job.garmentName || `trabajo-${job.id}`),
      `pose-${job.poseImageId}`,
      `job-${job.id}.${getFileExtension(output.resultImage)}`,
    ].join('_');

    zip.file(filename, blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipFilename = [
    sanitizeFilePart(batch.clientName || 'cliente'),
    sanitizeFilePart(batch.modelName || 'modelo'),
    sanitizeFilePart(batch.batchId),
  ].join('_');

  triggerDownload(zipBlob, `${zipFilename}.zip`);

  return jobsWithOutput.length;
};
