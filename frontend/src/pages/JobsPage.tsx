import { useEffect, useMemo, useState } from 'react';
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormSelect,
  CFormTextarea,
  CSpinner,
} from '../ui';
import { EmptyState } from '../components/EmptyState';
import { LoadingBlock } from '../components/LoadingBlock';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { fetchJobs, getApiErrorMessage, providerOptions, regenerateJob, resolveAssetUrl } from '../services/api';
import { buildBatchLabel, buildGarmentSlides, buildJobBatches, getCurrentOutput } from '../features/jobs/jobBatches';
import type { JobRecord, ProviderKey } from '../types/api';

interface JobDraft {
  provider: ProviderKey;
  prompt: string;
}

const buildInitialDraft = (job: JobRecord): JobDraft => ({
  provider: job.provider,
  prompt: job.prompt,
});

export const JobsPage = () => {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [jobDrafts, setJobDrafts] = useState<Record<number, JobDraft>>({});
  const [queueingJobIds, setQueueingJobIds] = useState<number[]>([]);
  const [selectedGarmentKey, setSelectedGarmentKey] = useState<string | null>(null);

  const loadJobs = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      setError(null);
      const response = await fetchJobs();
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

    const intervalId = window.setInterval(() => {
      void loadJobs();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    setJobDrafts((currentDrafts) => {
      const nextDrafts: Record<number, JobDraft> = {};

      jobs.forEach((job) => {
        nextDrafts[job.id] = currentDrafts[job.id] ?? buildInitialDraft(job);
      });

      return nextDrafts;
    });
  }, [jobs]);

  const batches = useMemo(() => buildJobBatches(jobs), [jobs]);
  const currentBatch = batches[0] ?? null;
  const garmentSlides = useMemo(() => buildGarmentSlides(currentBatch?.jobs ?? []), [currentBatch]);

  useEffect(() => {
    if (garmentSlides.length === 0) {
      setSelectedGarmentKey(null);
      return;
    }

    const selectedSlideStillExists = selectedGarmentKey
      ? garmentSlides.some((slide) => slide.key === selectedGarmentKey)
      : false;

    if (!selectedSlideStillExists) {
      setSelectedGarmentKey(garmentSlides[0].key);
    }
  }, [garmentSlides, selectedGarmentKey]);

  const activeSlideIndex = selectedGarmentKey
    ? garmentSlides.findIndex((slide) => slide.key === selectedGarmentKey)
    : -1;
  const activeSlide =
    activeSlideIndex >= 0 ? garmentSlides[activeSlideIndex] : garmentSlides[0] ?? null;

  const updateJobDraft = (jobId: number, patch: Partial<JobDraft>) => {
    setJobDrafts((currentDrafts) => ({
      ...currentDrafts,
      [jobId]: (() => {
        const sourceJob = jobs.find((job) => job.id === jobId);

        if (!sourceJob) {
          return currentDrafts[jobId];
        }

        return {
          ...(currentDrafts[jobId] ?? buildInitialDraft(sourceJob)),
          ...patch,
        };
      })(),
    }));
  };

  const handleRegenerate = async (job: JobRecord) => {
    const draft = jobDrafts[job.id] ?? buildInitialDraft(job);

    if (!draft.prompt.trim()) {
      setError('El prompt no puede quedar vacío para regenerar una foto.');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setQueueingJobIds((currentIds) => [...currentIds, job.id]);

      const updatedJob = await regenerateJob(job.id, {
        provider: draft.provider,
        prompt: draft.prompt.trim(),
      });

      setJobs((currentJobs) => currentJobs.map((currentJob) => (currentJob.id === updatedJob.id ? updatedJob : currentJob)));
      setSuccess(`La regeneración del trabajo #${job.id} quedó en cola prioritaria.`);
    } catch (regenerateError) {
      setError(getApiErrorMessage(regenerateError));
    } finally {
      setQueueingJobIds((currentIds) => currentIds.filter((jobId) => jobId !== job.id));
    }
  };

  const goToSlide = (nextIndex: number) => {
    const nextSlide = garmentSlides[nextIndex];

    if (!nextSlide) {
      return;
    }

    setSelectedGarmentKey(nextSlide.key);
  };

  const renderCarouselControls = () => {
    if (!activeSlide) {
      return null;
    }

    return (
      <div className="evaluation-carousel-controls">
        <CButton
          color="secondary"
          variant="outline"
          disabled={activeSlideIndex <= 0}
          onClick={() => goToSlide(activeSlideIndex - 1)}
        >
          Prenda anterior
        </CButton>

        <div className="evaluation-carousel-control-summary">
          <div className="evaluation-carousel-control-thumbs">
            {garmentSlides.map((slide, index) => (
              <button
                key={slide.key}
                type="button"
                className={`evaluation-carousel-control-thumb-button ${slide.key === activeSlide.key ? 'is-active' : ''}`}
                onClick={() => goToSlide(index)}
              >
                <img
                  className="evaluation-carousel-control-thumb"
                  src={resolveAssetUrl(slide.garmentFilePath)}
                  alt={slide.garmentName}
                  loading="lazy"
                />
              </button>
            ))}
          </div>

          <span>
            Prenda {activeSlideIndex + 1} de {garmentSlides.length} · {activeSlide.jobs.length} pose
            {activeSlide.jobs.length === 1 ? '' : 's'}
          </span>
        </div>

        <CButton
          color="secondary"
          variant="outline"
          disabled={activeSlideIndex >= garmentSlides.length - 1}
          onClick={() => goToSlide(activeSlideIndex + 1)}
        >
          Siguiente prenda
        </CButton>
      </div>
    );
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
                {renderCarouselControls()}

                <div className="evaluation-slide-grid">
                  {activeSlide.jobs.map((job, index) => {
                    const draft = jobDrafts[job.id] ?? buildInitialDraft(job);
                    const currentOutput = getCurrentOutput(job);
                    const queueing = queueingJobIds.includes(job.id);
                    const isRegenerating = queueing || job.status === 'processing';

                    return (
                      <CCard key={job.id} className={`evaluation-card ${isRegenerating ? 'is-processing' : ''}`}>
                        <CCardHeader className="evaluation-card-header">
                          <div>
                            <strong>Pose {index + 1}</strong>
                            <div className="text-body-secondary small">{job.modelName}</div>
                          </div>
                          <StatusBadge status={job.status} />
                        </CCardHeader>

                        <CCardBody>
                          <div className="evaluation-card-content">
                            <div className="evaluation-image-column">
                              {currentOutput ? (
                                <img
                                  className="evaluation-main-image"
                                  src={resolveAssetUrl(currentOutput.resultImage)}
                                  alt={`Resultado del trabajo ${job.id}`}
                                  loading="lazy"
                                />
                              ) : (
                                <div className="empty-thumb evaluation-empty">
                                  {job.status === 'failed'
                                    ? 'La generación falló. Ajusta el prompt o el proveedor e inténtalo otra vez.'
                                    : 'Todavía no hay una imagen generada para esta pose.'}
                                </div>
                              )}

                              {job.status !== 'completed' && currentOutput ? (
                                <div className="text-body-secondary small">
                                  Se muestra la imagen actual mientras el worker procesa la nueva solicitud.
                                </div>
                              ) : null}
                            </div>

                            <div className="evaluation-controls-column">
                              <div>
                                <label className="form-label">Modelo IA</label>
                                <CFormSelect
                                  value={draft.provider}
                                  onChange={(event) => updateJobDraft(job.id, { provider: event.target.value as ProviderKey })}
                                >
                                  {providerOptions.map((provider) => (
                                    <option key={provider.key} value={provider.key}>
                                      {provider.label}
                                    </option>
                                  ))}
                                </CFormSelect>
                              </div>

                              <div>
                                <label className="form-label">Prompt editable</label>
                                <CFormTextarea
                                  rows={7}
                                  value={draft.prompt}
                                  onChange={(event) => updateJobDraft(job.id, { prompt: event.target.value })}
                                />
                              </div>

                              <CButton
                                color="dark"
                                disabled={isRegenerating}
                                onClick={() => void handleRegenerate(job)}
                              >
                                {queueing ? 'Encolando...' : job.status === 'processing' ? 'Procesando...' : 'Regenerar foto'}
                              </CButton>
                            </div>
                          </div>
                        </CCardBody>

                        {isRegenerating ? (
                          <div className="evaluation-card-overlay">
                            <CSpinner color="secondary" />
                            <strong>{queueing ? 'Encolando regeneración...' : 'Regenerando imagen...'}</strong>
                            <span>Esta tarjeta se actualizará automáticamente cuando termine el proceso.</span>
                          </div>
                        ) : null}
                      </CCard>
                    );
                  })}
                </div>

                {renderCarouselControls()}

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
