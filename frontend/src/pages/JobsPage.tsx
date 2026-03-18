import { useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { CAlert, CButton, CCard, CCardBody, CCardHeader } from '../ui';
import { EmptyState } from '../components/EmptyState';
import { LoadingBlock } from '../components/LoadingBlock';
import { PageHeader } from '../components/PageHeader';
import { GarmentCarouselControls } from '../components/evaluation/GarmentCarouselControls';
import { JobEvaluationCard } from '../components/evaluation/JobEvaluationCard';
import { fetchCurrentJobs, getApiErrorMessage, regenerateJob, resolveAssetUrl } from '../services/api';
import { buildBatchLabel, buildJobBatches } from '../features/jobs/jobBatches';
import { buildInitialDraft, syncJobDrafts, updateJobDraftState, type JobDraft } from '../features/jobs/jobDrafts';
import { useGarmentCarousel } from '../features/jobs/useGarmentCarousel';
import type { JobRecord } from '../types/api';

export const JobsPage = () => {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [jobDrafts, setJobDrafts] = useState<Record<number, JobDraft>>({});
  const [queueingJobIds, setQueueingJobIds] = useState<number[]>([]);

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

  useEffect(() => {
    setJobDrafts((currentDrafts) => {
      return syncJobDrafts(jobs, currentDrafts);
    });
  }, [jobs]);

  useEffect(() => {
    setQueueingJobIds((currentIds) =>
      currentIds.filter((jobId) => jobs.find((job) => job.id === jobId)?.status === 'pending'),
    );
  }, [jobs]);

  const batches = useMemo(() => buildJobBatches(jobs), [jobs]);
  const currentBatch = batches[0] ?? null;
  const { activeSlide, activeSlideIndex, garmentSlides, goToSlide } = useGarmentCarousel(currentBatch?.jobs ?? []);
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

  const updateJobDraft = (jobId: number, patch: Partial<JobDraft>) => {
    setJobDrafts((currentDrafts) => updateJobDraftState(jobs, currentDrafts, jobId, patch));
  };

  const handleRegenerate = async (job: JobRecord) => {
    const draft = jobDrafts[job.id] ?? buildInitialDraft(job);

    if (!draft.prompt.trim()) {
      setError('El prompt no puede quedar vacío para regenerar una foto.');
      return;
    }

    try {
      flushSync(() => {
        setError(null);
        setSuccess(null);
        setQueueingJobIds((currentIds) => (currentIds.includes(job.id) ? currentIds : [...currentIds, job.id]));
      });

      const updatedJob = await regenerateJob(job.id, {
        provider: draft.provider,
        prompt: draft.prompt.trim(),
      });

      setJobs((currentJobs) => currentJobs.map((currentJob) => (currentJob.id === updatedJob.id ? updatedJob : currentJob)));
      setSuccess(`La regeneración del trabajo #${job.id} quedó en cola prioritaria.`);
    } catch (regenerateError) {
      setQueueingJobIds((currentIds) => currentIds.filter((jobId) => jobId !== job.id));
      setError(getApiErrorMessage(regenerateError));
    }
  };

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
            ) : !activeSlide ? (
              <EmptyState
                title="No hay prendas para mostrar"
                description="Este lote no tiene un agrupado de prendas válido en este momento."
              />
            ) : (
              <div className="evaluation-carousel-layout">
                <GarmentCarouselControls
                  activeSlideIndex={activeSlideIndex}
                  slides={garmentSlides}
                  onSelectSlide={goToSlide}
                />

                <div className="evaluation-slide-grid">
                  {activeSlide.jobs.map((job, index) => {
                    const draft = jobDrafts[job.id] ?? buildInitialDraft(job);
                    const queueing = queueingJobIds.includes(job.id);

                    return (
                      <JobEvaluationCard
                        key={job.id}
                        draft={draft}
                        emptyMessage={
                          job.status === 'failed'
                            ? 'La generación falló. Ajusta el prompt o el proveedor e inténtalo otra vez.'
                            : 'Todavía no hay una imagen generada para esta pose.'
                        }
                        imageAlt={`Resultado del trabajo ${job.id}`}
                        job={job}
                        queueing={queueing}
                        showProcessingHint
                        subtitle={job.modelName}
                        title={`Pose ${index + 1}`}
                        onRegenerate={handleRegenerate}
                        onUpdateDraft={updateJobDraft}
                      />
                    );
                  })}
                </div>

                <GarmentCarouselControls
                  activeSlideIndex={activeSlideIndex}
                  slides={garmentSlides}
                  onSelectSlide={goToSlide}
                />

                <div className="evaluation-floating-garment">
                  <img src={resolveAssetUrl(activeSlide.garmentFilePath)} alt={activeSlide.garmentName} loading="lazy" />
                </div>
              </div>
            )}
          </CCardBody>
        </CCard>
      ) : null}
    </>
  );
};
