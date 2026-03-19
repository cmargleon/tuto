import { createApp } from './app';
import { env } from './config/env';
import './db';
import { ensureStorageFolders } from './storage/fileStorage';
import { startRetentionSchedule } from './services/retentionService';
import { logger } from './utils/logger';
import { startJobWorker, stopJobWorker } from './worker/jobWorker';

ensureStorageFolders();

const app = createApp();

const server = app.listen(env.port, () => {
  startJobWorker(env.workerPollIntervalMs);
  startRetentionSchedule();
  logger.info({ port: env.port }, `Backend escuchando en http://localhost:${env.port}`);
});

const shutdown = (): void => {
  stopJobWorker();
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
