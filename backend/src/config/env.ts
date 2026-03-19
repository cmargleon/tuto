import path from 'node:path';
import dotenv from 'dotenv';

const backendRoot = path.resolve(__dirname, '..', '..');
const projectRoot = path.resolve(backendRoot, '..');

dotenv.config({ path: path.resolve(projectRoot, '.env') });
dotenv.config({ path: path.resolve(backendRoot, '.env'), override: true });

const resolvePath = (value: string | undefined, fallbackRelativePath: string): string => {
  const raw = value ?? fallbackRelativePath;

  if (raw === ':memory:') return ':memory:';
  return path.isAbsolute(raw) ? raw : path.resolve(backendRoot, raw);
};

const parseNumber = (value: string | undefined, fallbackValue: number): number => {
  if (!value) {
    return fallbackValue;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallbackValue;
};

export const env = {
  backendRoot,
  projectRoot,
  port: parseNumber(process.env.PORT, 4000),
  databasePath: resolvePath(process.env.DATABASE_PATH, '../database/app.db'),
  uploadRoot: resolvePath(process.env.UPLOAD_ROOT, '../uploads'),
  storageDriver: process.env.STORAGE_DRIVER === 's3' ? 's3' : 'local',
  uploadMaxFileSizeMb: parseNumber(process.env.UPLOAD_MAX_FILE_SIZE_MB, 20),
  workerPollIntervalMs: parseNumber(process.env.WORKER_POLL_INTERVAL_MS, 5000),
  workerJobTimeoutMs: parseNumber(process.env.WORKER_JOB_TIMEOUT_MS, 15 * 60 * 1000),
  workerMaxRetries: parseNumber(process.env.WORKER_MAX_RETRIES, 3),
  batchMaxJobs: parseNumber(process.env.BATCH_MAX_JOBS, 50),
  dataRetentionDays: parseNumber(process.env.DATA_RETENTION_DAYS, 60),
  falKey: process.env.FAL_KEY ?? '',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
  awsRegion: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? '',
  awsS3Bucket: process.env.AWS_S3_BUCKET ?? '',
  awsS3Prefix: (process.env.AWS_S3_PREFIX ?? '').replace(/^\/+|\/+$/g, ''),
  awsS3Endpoint: process.env.AWS_S3_ENDPOINT ?? '',
  awsS3ForcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
  awsS3SignedUrlTtlSeconds: parseNumber(process.env.AWS_S3_SIGNED_URL_TTL_SECONDS, 900),
};
