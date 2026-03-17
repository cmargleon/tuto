import { useEffect, useMemo, useState } from 'react';
import { CAlert, CButton, CCard, CCardBody, CCardHeader, CFormSelect, CFormTextarea, CSpinner } from '../ui';
import { EmptyState } from '../components/EmptyState';
import { LoadingBlock } from '../components/LoadingBlock';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { fetchJobs, getApiErrorMessage, providerOptions, regenerateJob, resolveAssetUrl } from '../services/api';
import type { JobRecord, ProviderKey } from '../types/api';
import {
  buildBatchLabel,
  buildGarmentSlides,
  buildJobBatches,
  downloadBatchImages,
  formatBatchDate,
  getCurrentOutput,
} from '../features/jobs/jobBatches';

interface JobDraft {
  provider: ProviderKey;
  prompt: string;
}

const buildInitialDraft = (job: JobRecord): JobDraft => ({
  provider: job.provider,
  prompt: job.prompt,
});

export const ArchivePage = () => {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [jobDrafts, setJobDrafts] = useState<Record<number, JobDraft>>({});
  const [queueingJobIds, setQueueingJobIds] = useState<number[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedGarmentKey, setSelectedGarmentKey] = useState<string | null>(null);
  const [downloadingBatchId, setDownloadingBatchId] = useState<string | null>(null);

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

  const archiveClientOptions = useMemo(
    () =>
      Array.from(
        new Map(
          batches
            .filter((batch) => batch.clientId !== null)
            .map((batch) => [String(batch.clientId), { id: String(batch.clientId), name: batch.clientName }]),
        ).values(),
      ),
    [batches],
  );

  const archiveBatches = useMemo(
    () =>
      batches.filter(
        (batch) =>
          String(batch.clientId ?? '') === selectedClientId,
      ),
    [batches, selectedClientId],
  );

  const selectedBatch = archiveBatches.find((batch) => batch.batchId === selectedBatchId) ?? null;
  const garmentSlides = useMemo(() => buildGarmentSlides(selectedBatch?.jobs ?? []), [selectedBatch]);

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

  useEffect(() => {
    if (archiveClientOptions.length === 0) {
      setSelectedClientId('');
      return;
    }

    const currentClientStillAvailable = archiveClientOptions.some((client) => client.id === selectedClientId);

    if (!currentClientStillAvailable) {
      const preferredClientId =
        currentBatch?.clientId !== null &&
        archiveClientOptions.some((client) => client.id === String(currentBatch.clientId))
          ? String(currentBatch.clientId)
          : archiveClientOptions[0].id;

      setSelectedClientId(preferredClientId);
    }
  }, [archiveClientOptions, currentBatch?.clientId, selectedClientId]);

  useEffect(() => {
    if (archiveBatches.length === 0) {
      setSelectedBatchId('');
      return;
    }

    const currentBatchStillAvailable = archiveBatches.some((batch) => batch.batchId === selectedBatchId);

    if (!currentBatchStillAvailable) {
      setSelectedBatchId(archiveBatches[0].batchId);
    }
  }, [archiveBatches, selectedBatchId]);

  const handleDownloadArchive = async () => {
    if (!selectedBatch) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setDownloadingBatchId(selectedBatch.batchId);

      const downloadedCount = await downloadBatchImages(selectedBatch, resolveAssetUrl);
      setSuccess(`Se descargaron ${downloadedCount} imagen${downloadedCount === 1 ? '' : 'es'} del archivo.`);
    } catch (downloadError) {
      setError(getApiErrorMessage(downloadError));
    } finally {
      setDownloadingBatchId(null);
    }
  };

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
      setSuccess(`La regeneración del trabajo #${job.id} quedó en cola.`);
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
        title="Archivo"
        description="Aquí se consulta el historial de trabajos realizados por cliente. La evaluación activa queda reservada solo al lote en curso."
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
                <h5 className="mb-1">Historial por cliente</h5>
                <p className="text-body-secondary mb-0">
                  Selecciona un cliente, luego un trabajo previo, y debajo verás sus imágenes generadas con opción de guardarlas todas.
                </p>
              </div>
            </div>
          </CCardHeader>
          <CCardBody>
            {archiveClientOptions.length === 0 ? (
              <EmptyState
                title="Todavía no hay trabajos archivados"
                description="Cuando generes el primer lote, aparecerá aquí de inmediato organizado por cliente."
              />
            ) : (
              <div className="evaluation-panel-stack">
                <div className="archive-toolbar">
                  <div className="archive-filter">
                    <label className="form-label">Cliente</label>
                    <CFormSelect value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
                      {archiveClientOptions.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </CFormSelect>
                  </div>

                  <div className="archive-filter">
                    <label className="form-label">Trabajo realizado</label>
                    <CFormSelect value={selectedBatchId} onChange={(event) => setSelectedBatchId(event.target.value)}>
                      {archiveBatches.map((batch) => (
                        <option key={batch.batchId} value={batch.batchId}>
                          {buildBatchLabel(batch)}
                        </option>
                      ))}
                    </CFormSelect>
                  </div>
                </div>

                {!selectedBatch ? (
                  <EmptyState
                    title="No hay trabajos para este cliente"
                    description="Selecciona otro cliente o genera un nuevo lote para poblar el archivo."
                  />
                ) : (
                  <>
                    <div className="evaluation-archive-summary">
                      <strong>{selectedBatch.clientName}</strong>
                      <span>
                        {selectedBatch.modelName} · {selectedBatch.jobs.length} resultado
                        {selectedBatch.jobs.length === 1 ? '' : 's'} · {formatBatchDate(selectedBatch.latestCreatedAt)}
                      </span>
                    </div>

                    {!activeSlide ? (
                      <EmptyState
                        title="No hay prendas para este trabajo"
                        description="Este lote archivado no tiene un agrupado de prendas disponible en este momento."
                      />
                    ) : (
                      <div className="evaluation-carousel-layout">
                        {renderCarouselControls()}

                        <div className="evaluation-slide-grid">
                          {activeSlide.jobs.map((job) => {
                        const currentOutput = getCurrentOutput(job);
                        const draft = jobDrafts[job.id] ?? buildInitialDraft(job);
                        const queueing = queueingJobIds.includes(job.id);
                        const isRegenerating = queueing || job.status === 'processing';

                        return (
                          <CCard key={job.id} className={`evaluation-card ${isRegenerating ? 'is-processing' : ''}`}>
                            <CCardHeader className="evaluation-card-header">
                              <div>
                                <strong>{job.garmentName}</strong>
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
                                      alt={`Resultado archivado del trabajo ${job.id}`}
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="empty-thumb evaluation-empty">Este trabajo no tiene una imagen final disponible.</div>
                                  )}
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
                      </div>
                    )}

                    <div className="archive-actions">
                      <CButton
                        color="dark"
                        disabled={downloadingBatchId === selectedBatch.batchId}
                        onClick={() => void handleDownloadArchive()}
                      >
                        {downloadingBatchId === selectedBatch.batchId ? 'Guardando imágenes...' : 'Guardar todas las imágenes'}
                      </CButton>
                    </div>
                  </>
                )}
              </div>
            )}
          </CCardBody>
        </CCard>
      ) : null}
    </>
  );
};
