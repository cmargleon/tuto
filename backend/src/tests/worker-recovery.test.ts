import { beforeEach, describe, expect, it } from 'vitest';
import { requeueProcessingJobs, requeueStuckJobs } from '../services/jobService';
import { type SeedData, getJobRow, insertJob, seedBaseData } from './helpers';

const minsAgo = (minutes: number): string =>
  new Date(Date.now() - minutes * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

describe('requeueProcessingJobs', () => {
  let seed: SeedData;

  beforeEach(() => {
    seed = seedBaseData();
  });

  it('resetea todos los jobs processing a pending y limpia started_at', () => {
    const processingId = insertJob(seed, { status: 'processing', started_at: minsAgo(5) });
    const pendingId = insertJob(seed, { status: 'pending' });
    const completedId = insertJob(seed, { status: 'completed' });

    const changed = requeueProcessingJobs();

    expect(changed).toBe(1);
    expect(getJobRow(processingId)).toMatchObject({ status: 'pending', started_at: null });
    expect(getJobRow(pendingId)).toMatchObject({ status: 'pending' });
    expect(getJobRow(completedId)).toMatchObject({ status: 'completed' });
  });

  it('devuelve 0 si no hay jobs processing', () => {
    insertJob(seed, { status: 'pending' });
    expect(requeueProcessingJobs()).toBe(0);
  });
});

describe('requeueStuckJobs', () => {
  const TIMEOUT_MS = 15 * 60 * 1000; // 15 min
  let seed: SeedData;

  beforeEach(() => {
    seed = seedBaseData();
  });

  it('re-encola jobs stuck y no toca los recientes', () => {
    const stuckId = insertJob(seed, { status: 'processing', started_at: minsAgo(20) });
    const recentId = insertJob(seed, { status: 'processing', started_at: minsAgo(5) });

    const changed = requeueStuckJobs(TIMEOUT_MS);

    expect(changed).toBe(1);
    expect(getJobRow(stuckId)).toMatchObject({ status: 'pending', retry_count: 1, started_at: null });
    expect(getJobRow(recentId)).toMatchObject({ status: 'processing' });
  });

  it('no afecta jobs que no están processing', () => {
    insertJob(seed, { status: 'pending', started_at: minsAgo(60) });
    insertJob(seed, { status: 'completed', started_at: minsAgo(60) });
    insertJob(seed, { status: 'failed', started_at: minsAgo(60) });

    expect(requeueStuckJobs(TIMEOUT_MS)).toBe(0);
  });

  it('no re-encola jobs processing sin started_at', () => {
    insertJob(seed, { status: 'processing', started_at: null });
    expect(requeueStuckJobs(TIMEOUT_MS)).toBe(0);
  });

  it('incrementa retry_count en cada re-encola', () => {
    const jobId = insertJob(seed, { status: 'processing', started_at: minsAgo(20), retry_count: 2 });

    requeueStuckJobs(TIMEOUT_MS);

    expect(getJobRow(jobId)).toMatchObject({ retry_count: 3 });
  });
});
