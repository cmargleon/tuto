import { beforeEach, describe, expect, it } from 'vitest';
import { retryOrFailJob } from '../services/jobService';
import { type SeedData, getJobRow, insertJob, seedBaseData } from './helpers';

const MAX_RETRIES = 3;

describe('retryOrFailJob', () => {
  let seed: SeedData;

  beforeEach(() => {
    seed = seedBaseData();
  });

  it('re-encola como pending cuando retry_count < maxRetries', () => {
    const jobId = insertJob(seed, { status: 'processing', retry_count: 0 });

    retryOrFailJob(jobId, MAX_RETRIES);

    expect(getJobRow(jobId)).toMatchObject({ status: 'pending', retry_count: 1 });
  });

  it('marca como failed cuando retry_count alcanza maxRetries', () => {
    const jobId = insertJob(seed, { status: 'processing', retry_count: 3 });

    retryOrFailJob(jobId, MAX_RETRIES);

    expect(getJobRow(jobId)).toMatchObject({ status: 'failed' });
  });

  it('marca como failed cuando retry_count supera maxRetries', () => {
    const jobId = insertJob(seed, { status: 'processing', retry_count: 5 });

    retryOrFailJob(jobId, MAX_RETRIES);

    expect(getJobRow(jobId)).toMatchObject({ status: 'failed' });
  });

  it('limpia started_at tanto en retry como en fail', () => {
    const retryJobId = insertJob(seed, {
      status: 'processing',
      started_at: '2024-01-01 00:00:00',
      retry_count: 0,
    });
    const failJobId = insertJob(seed, {
      status: 'processing',
      started_at: '2024-01-01 00:00:00',
      retry_count: 3,
    });

    retryOrFailJob(retryJobId, MAX_RETRIES);
    retryOrFailJob(failJobId, MAX_RETRIES);

    expect(getJobRow(retryJobId)).toMatchObject({ started_at: null });
    expect(getJobRow(failJobId)).toMatchObject({ started_at: null });
  });

  it('no lanza error con un job inexistente', () => {
    expect(() => retryOrFailJob(99999, MAX_RETRIES)).not.toThrow();
  });
});
