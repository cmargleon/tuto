import { useEffect, useMemo, useState } from 'react';
import { CAlert, CButton, CCard, CCardBody, CCardHeader } from '../ui';
import { JobBatchCarousel } from '../components/evaluation/JobBatchCarousel';
import { EmptyState } from '../components/EmptyState';
import { LoadingBlock } from '../components/LoadingBlock';
import { PageHeader } from '../components/PageHeader';
import { fetchCurrentJobs, getApiErrorMessage } from '../services/api';
import { buildBatchLabel, buildJobBatches } from '../features/jobs/jobBatches';
import { useJobRegeneration } from '../features/jobs/useJobRegeneration';
import type { JobRecord } from '../types/api';

export const JobsPage = () => {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadJobs = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      setError(null);
      const response = await fetchCurrentJobs();
      setJobs(response);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadJobs(true);
  }, []);

  const batches = useMemo(() => buildJobBatches(jobs), [jobs]);
  const currentBatch = batches[0] ?? null;
  const { jobDrafts, queueingJobIds, regenerateJobWithDraft, updateJobDraft } = useJobRegeneration({
    jobs,
    onError: setError,
    onSuccess: setSuccess,
    setJobs,
    successMessage: (job) => `La regeneración del trabajo #${job.id} quedó en cola prioritaria.`,
  });
  const shouldPollCurrent =
    queueingJobIds.length > 0 ||
    (currentBatch?.jobs ?? []).some((job) => job.status === 'pending' || job.status === 'processing');

  useEffect(() => {
    if (!shouldPollCurrent) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadJobs();
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [shouldPollCurrent]);

  return (
    <>
      <PageHeader
        title="Evaluación"
        description="Esta pantalla trabaja solo con la generación actual y ahora recorre el lote por prenda. Si necesitas revisar el historial, entra a Archivo desde la navegación lateral."
        actions={
          <CButton color="dark" variant="outline" onClick={() => void loadJobs()}>
            Actualizar
          </CButton>
        }
      />

      {loading ? <LoadingBlock /> : null}
      {error ? <CAlert color="danger">{error}</CAlert> : null}
      {success ? <CAlert color="success">{success}</CAlert> : null}

      {!loading ? (
        <CCard className="studio-card">
          <CCardHeader className="border-0 bg-transparent pt-4">
            <div className="evaluation-section-head">
              <div>
                <h5 className="mb-1">Trabajo actual</h5>
                <p className="text-body-secondary mb-0">
                  Cada slide corresponde a una prenda y agrupa todas las poses generadas para esa prenda dentro del lote más reciente.
                </p>
              </div>
              {currentBatch ? <div className="evaluation-section-chip">{buildBatchLabel(currentBatch)}</div> : null}
            </div>
          </CCardHeader>
          <CCardBody>
            {jobs.length === 0 ? (
              <EmptyState
                title="Aún no se han creado trabajos"
                description="Usa el wizard para subir prendas y crear combinaciones. Cuando exista un lote, aquí aparecerá agrupado por prenda."
              />
            ) : !currentBatch ? (
              <EmptyState
                title="No se encontró un trabajo actual"
                description="Actualiza la página para volver a cargar el último lote disponible."
              />
            ) : (
              <JobBatchCarousel
                emptyDescription="Este lote no tiene un agrupado de prendas válido en este momento."
                emptyTitle="No hay prendas para mostrar"
                getEmptyMessage={(job) =>
                  job.status === 'failed'
                    ? 'La generación falló. Ajusta el prompt o el proveedor e inténtalo otra vez.'
                    : 'Todavía no hay una imagen generada para esta pose.'
                }
                jobDrafts={jobDrafts}
                jobs={currentBatch.jobs}
                queueingJobIds={queueingJobIds}
                showFloatingGarment
                showProcessingHint
                onRegenerate={regenerateJobWithDraft}
                onUpdateDraft={updateJobDraft}
              />
            )}
          </CCardBody>
        </CCard>
      ) : null}
    </>
  );
};
