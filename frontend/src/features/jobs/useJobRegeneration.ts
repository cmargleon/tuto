import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import { getApiErrorMessage, regenerateJob } from '../../services/api';
import type { JobRecord } from '../../types/api';
import { buildInitialDraft, syncJobDrafts, updateJobDraftState, type JobDraft } from './jobDrafts';

interface UseJobRegenerationOptions {
  jobs: JobRecord[];
  onError: (message: string | null) => void;
  onSuccess: (message: string | null) => void;
  setJobs: Dispatch<SetStateAction<JobRecord[]>>;
  successMessage: (job: JobRecord) => string;
}

export const useJobRegeneration = ({
  jobs,
  onError,
  onSuccess,
  setJobs,
  successMessage,
}: UseJobRegenerationOptions) => {
  const [jobDrafts, setJobDrafts] = useState<Record<number, JobDraft>>({});
  const [queueingJobIds, setQueueingJobIds] = useState<number[]>([]);

  useEffect(() => {
    setJobDrafts((currentDrafts) => syncJobDrafts(jobs, currentDrafts));
  }, [jobs]);

  useEffect(() => {
    setQueueingJobIds((currentIds) =>
      currentIds.filter((jobId) => jobs.find((job) => job.id === jobId)?.status === 'pending'),
    );
  }, [jobs]);

  const updateJobDraft = (jobId: number, patch: Partial<JobDraft>) => {
    setJobDrafts((currentDrafts) => updateJobDraftState(jobs, currentDrafts, jobId, patch));
  };

  const regenerateJobWithDraft = async (job: JobRecord) => {
    const draft = jobDrafts[job.id] ?? buildInitialDraft(job);

    if (!draft.prompt.trim()) {
      onError('El prompt no puede quedar vacío para regenerar una foto.');
      return;
    }

    try {
      flushSync(() => {
        onError(null);
        onSuccess(null);
        setQueueingJobIds((currentIds) => (currentIds.includes(job.id) ? currentIds : [...currentIds, job.id]));
      });

      const updatedJob = await regenerateJob(job.id, {
        provider: draft.provider,
        prompt: draft.prompt.trim(),
      });

      setJobs((currentJobs) => currentJobs.map((currentJob) => (currentJob.id === updatedJob.id ? updatedJob : currentJob)));
      onSuccess(successMessage(job));
    } catch (regenerateError) {
      setQueueingJobIds((currentIds) => currentIds.filter((jobId) => jobId !== job.id));
      onError(getApiErrorMessage(regenerateError));
    }
  };

  return {
    jobDrafts,
    queueingJobIds,
    regenerateJobWithDraft,
    updateJobDraft,
  };
};
