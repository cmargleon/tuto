import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { CAlert, CButton, CCard, CCardBody, CCardHeader, CFormSelect } from '../ui';
import { EmptyState } from '../components/EmptyState';
import { GarmentCarouselControls } from '../components/evaluation/GarmentCarouselControls';
import { JobEvaluationCard } from '../components/evaluation/JobEvaluationCard';
import { LoadingBlock } from '../components/LoadingBlock';
import { PageHeader } from '../components/PageHeader';
import {
  fetchArchiveBatchJobs,
  fetchArchiveBatches,
  fetchArchiveClients,
  getApiErrorMessage,
  regenerateJob,
  resolveAssetUrl,
} from '../services/api';
import type { ArchiveBatchSummary, ArchiveClientSummary, JobRecord } from '../types/api';
import { downloadBatchImages, formatBatchDate, type JobBatch } from '../features/jobs/jobBatches';
import { buildInitialDraft, syncJobDrafts, updateJobDraftState, type JobDraft } from '../features/jobs/jobDrafts';
import { useGarmentCarousel } from '../features/jobs/useGarmentCarousel';

const archivePageSize = 20;

const buildArchiveBatchLabel = (batch: ArchiveBatchSummary): string =>
  `Trabajo #${batch.latestJobId} · ${formatBatchDate(batch.latestCreatedAt)} · ${batch.completedImages} imagen${
    batch.completedImages === 1 ? '' : 'es'
  }`;

export const ArchivePage = () => {
  const [archiveClients, setArchiveClients] = useState<ArchiveClientSummary[]>([]);
  const [archiveBatches, setArchiveBatches] = useState<ArchiveBatchSummary[]>([]);
  const [batchJobs, setBatchJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingBatchJobs, setLoadingBatchJobs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [jobDrafts, setJobDrafts] = useState<Record<number, JobDraft>>({});
  const [queueingJobIds, setQueueingJobIds] = useState<number[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [downloadingBatchId, setDownloadingBatchId] = useState<string | null>(null);
  const [batchPage, setBatchPage] = useState(1);
  const [batchTotalPages, setBatchTotalPages] = useState(0);

  const loadArchiveClients = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      setError(null);
      const response = await fetchArchiveClients();
      setArchiveClients(response);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const loadArchiveBatches = async (clientId: number, page: number) => {
    try {
      setLoadingBatches(true);
      setError(null);

      const response = await fetchArchiveBatches(clientId, page, archivePageSize);
      setArchiveBatches(response.items);
      setBatchPage(response.page);
      setBatchTotalPages(response.totalPages);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoadingBatches(false);
    }
  };

  const loadBatchJobs = async (batchId: string, showLoading = false) => {
    try {
      if (showLoading) {
        setLoadingBatchJobs(true);
      }

      setError(null);
      const response = await fetchArchiveBatchJobs(batchId);
      setBatchJobs(response);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      if (showLoading) {
        setLoadingBatchJobs(false);
      }
    }
  };

  useEffect(() => {
    void loadArchiveClients(true);
  }, []);

  useEffect(() => {
    if (archiveClients.length === 0) {
      setSelectedClientId('');
      return;
    }

    const currentClientStillAvailable = archiveClients.some((client) => String(client.id) === selectedClientId);

    if (!currentClientStillAvailable) {
      setSelectedClientId(String(archiveClients[0].id));
    }
  }, [archiveClients, selectedClientId]);

  useEffect(() => {
    if (!selectedClientId) {
      setArchiveBatches([]);
      setBatchPage(1);
      setBatchTotalPages(0);
      return;
    }

    void loadArchiveBatches(Number(selectedClientId), batchPage);
  }, [selectedClientId, batchPage]);

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

  useEffect(() => {
    if (!selectedBatchId) {
      setBatchJobs([]);
      return;
    }

    void loadBatchJobs(selectedBatchId, true);
  }, [selectedBatchId]);

  useEffect(() => {
    setJobDrafts((currentDrafts) => syncJobDrafts(batchJobs, currentDrafts));
  }, [batchJobs]);

  useEffect(() => {
    setQueueingJobIds((currentIds) =>
      currentIds.filter((jobId) => batchJobs.find((job) => job.id === jobId)?.status === 'pending'),
    );
  }, [batchJobs]);

  const selectedBatch = archiveBatches.find((batch) => batch.batchId === selectedBatchId) ?? null;
  const { activeSlide, activeSlideIndex, garmentSlides, goToSlide } = useGarmentCarousel(batchJobs);
  const shouldPollArchive =
    queueingJobIds.length > 0 || batchJobs.some((job) => job.status === 'pending' || job.status === 'processing');

  useEffect(() => {
    if (!shouldPollArchive || !selectedBatchId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void Promise.allSettled([
        loadBatchJobs(selectedBatchId),
        selectedClientId ? loadArchiveBatches(Number(selectedClientId), batchPage) : Promise.resolve(),
      ]);
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [batchPage, selectedBatchId, selectedClientId, shouldPollArchive]);

  const handleRefresh = async () => {
    await loadArchiveClients(true);

    if (selectedClientId) {
      await loadArchiveBatches(Number(selectedClientId), batchPage);
    }

    if (selectedBatchId) {
      await loadBatchJobs(selectedBatchId);
    }
  };

  const handleDownloadArchive = async () => {
    if (!selectedBatch) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setDownloadingBatchId(selectedBatch.batchId);

      const batchForDownload: JobBatch = {
        batchId: selectedBatch.batchId,
        clientId: selectedBatch.clientId,
        clientName: selectedBatch.clientName,
        modelName: selectedBatch.modelName,
        jobs: batchJobs,
        latestJobId: selectedBatch.latestJobId,
        latestCreatedAt: selectedBatch.latestCreatedAt,
        completedImages: selectedBatch.completedImages,
      };

      const downloadedCount = await downloadBatchImages(batchForDownload, resolveAssetUrl);
      setSuccess(`Se descargaron ${downloadedCount} imagen${downloadedCount === 1 ? '' : 'es'} del archivo.`);
    } catch (downloadError) {
      setError(getApiErrorMessage(downloadError));
    } finally {
      setDownloadingBatchId(null);
    }
  };

  const updateJobDraft = (jobId: number, patch: Partial<JobDraft>) => {
    setJobDrafts((currentDrafts) => updateJobDraftState(batchJobs, currentDrafts, jobId, patch));
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

      setBatchJobs((currentJobs) => currentJobs.map((currentJob) => (currentJob.id === updatedJob.id ? updatedJob : currentJob)));
      setSuccess(`La regeneración del trabajo #${job.id} quedó en cola.`);
    } catch (regenerateError) {
      setQueueingJobIds((currentIds) => currentIds.filter((jobId) => jobId !== job.id));
      setError(getApiErrorMessage(regenerateError));
    }
  };

  return (
    <>
      <PageHeader
        title="Archivo"
        description="Aquí se consulta el historial de trabajos realizados por cliente. La evaluación activa queda reservada solo al lote en curso."
        actions={
          <CButton color="dark" variant="outline" onClick={() => void handleRefresh()}>
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
            {archiveClients.length === 0 ? (
              <EmptyState
                title="Todavía no hay trabajos archivados"
                description="Cuando generes el primer lote, aparecerá aquí de inmediato organizado por cliente."
              />
            ) : (
              <div className="evaluation-panel-stack">
                <div className="archive-toolbar">
                  <div className="archive-filter">
                    <label className="form-label">Cliente</label>
                    <CFormSelect
                      value={selectedClientId}
                      onChange={(event) => {
                        setSelectedClientId(event.target.value);
                        setBatchPage(1);
                      }}
                    >
                      {archiveClients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </CFormSelect>
                  </div>

                  <div className="archive-filter">
                    <label className="form-label">Trabajo realizado</label>
                    <CFormSelect
                      value={selectedBatchId}
                      onChange={(event) => setSelectedBatchId(event.target.value)}
                      disabled={loadingBatches || archiveBatches.length === 0}
                    >
                      {archiveBatches.map((batch) => (
                        <option key={batch.batchId} value={batch.batchId}>
                          {buildArchiveBatchLabel(batch)}
                        </option>
                      ))}
                    </CFormSelect>
                  </div>
                </div>

                {batchTotalPages > 1 ? (
                  <div className="archive-actions">
                    <CButton
                      color="secondary"
                      variant="outline"
                      disabled={batchPage <= 1 || loadingBatches}
                      onClick={() => setBatchPage((currentPage) => Math.max(1, currentPage - 1))}
                    >
                      Lotes anteriores
                    </CButton>
                    <div className="text-body-secondary small">
                      Página {batchPage} de {batchTotalPages}
                    </div>
                    <CButton
                      color="secondary"
                      variant="outline"
                      disabled={batchPage >= batchTotalPages || loadingBatches}
                      onClick={() => setBatchPage((currentPage) => Math.min(batchTotalPages, currentPage + 1))}
                    >
                      Lotes siguientes
                    </CButton>
                  </div>
                ) : null}

                {loadingBatches ? <LoadingBlock /> : null}

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
                        {selectedBatch.modelName} · {selectedBatch.totalJobs} resultado
                        {selectedBatch.totalJobs === 1 ? '' : 's'} · {formatBatchDate(selectedBatch.latestCreatedAt)}
                      </span>
                    </div>

                    {loadingBatchJobs ? (
                      <LoadingBlock />
                    ) : !activeSlide ? (
                      <EmptyState
                        title="No hay prendas para este trabajo"
                        description="Este lote archivado no tiene un agrupado de prendas disponible en este momento."
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
                                emptyMessage="Este trabajo no tiene una imagen final disponible."
                                imageAlt={`Resultado archivado del trabajo ${job.id}`}
                                job={job}
                                queueing={queueing}
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
