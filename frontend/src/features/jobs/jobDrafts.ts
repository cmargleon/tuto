import type { JobRecord, ProviderKey } from '../../types/api';

export interface JobDraft {
  provider: ProviderKey;
  prompt: string;
}

export const buildInitialDraft = (job: JobRecord): JobDraft => ({
  provider: job.provider,
  prompt: job.prompt,
});

export const syncJobDrafts = (
  jobs: JobRecord[],
  currentDrafts: Record<number, JobDraft>,
): Record<number, JobDraft> => {
  const nextDrafts: Record<number, JobDraft> = {};

  jobs.forEach((job) => {
    nextDrafts[job.id] = currentDrafts[job.id] ?? buildInitialDraft(job);
  });

  return nextDrafts;
};

export const updateJobDraftState = (
  jobs: JobRecord[],
  currentDrafts: Record<number, JobDraft>,
  jobId: number,
  patch: Partial<JobDraft>,
): Record<number, JobDraft> => {
  const sourceJob = jobs.find((job) => job.id === jobId);

  if (!sourceJob) {
    return currentDrafts;
  }

  return {
    ...currentDrafts,
    [jobId]: {
      ...(currentDrafts[jobId] ?? buildInitialDraft(sourceJob)),
      ...patch,
    },
  };
};
