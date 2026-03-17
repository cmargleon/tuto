import path from 'node:path';
import dotenv from 'dotenv';

const backendRoot = path.resolve(__dirname, '..', '..');
const projectRoot = path.resolve(backendRoot, '..');

dotenv.config({ path: path.resolve(projectRoot, '.env') });
dotenv.config({ path: path.resolve(backendRoot, '.env'), override: true });

const resolvePath = (value: string | undefined, fallbackRelativePath: string): string => {
  const raw = value ?? fallbackRelativePath;

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
  workerPollIntervalMs: parseNumber(process.env.WORKER_POLL_INTERVAL_MS, 5000),
  falKey: process.env.FAL_KEY ?? '',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
};
