import { CButton, CCard, CCardBody, CCardHeader, CFormSelect, CFormTextarea, CSpinner } from '../../ui';
import { StatusBadge } from '../StatusBadge';
import { getCurrentOutput } from '../../features/jobs/jobBatches';
import type { JobDraft } from '../../features/jobs/jobDrafts';
import { providerOptions, resolveAssetUrl, resolveProxyAssetUrl } from '../../services/api';
import type { JobRecord, ProviderKey } from '../../types/api';

interface JobEvaluationCardProps {
  draft: JobDraft;
  emptyMessage: string;
  imageAlt: string;
  job: JobRecord;
  queueing: boolean;
  showProcessingHint?: boolean;
  subtitle?: string;
  title: string;
  onRegenerate: (job: JobRecord) => void;
  onUpdateDraft: (jobId: number, patch: Partial<JobDraft>) => void;
}

export const JobEvaluationCard = ({
  draft,
  emptyMessage,
  imageAlt,
  job,
  queueing,
  showProcessingHint = false,
  subtitle,
  title,
  onRegenerate,
  onUpdateDraft,
}: JobEvaluationCardProps) => {
  const currentOutput = getCurrentOutput(job);
  const isRegenerating = queueing || job.status === 'processing';

  return (
    <CCard className={`evaluation-card ${isRegenerating ? 'is-processing' : ''}`}>
      <CCardHeader className="evaluation-card-header">
        <div>
          <strong>{title}</strong>
          {subtitle ? <div className="text-body-secondary small">{subtitle}</div> : null}
        </div>
        <StatusBadge status={job.status} />
      </CCardHeader>

      <CCardBody>
        <div className="evaluation-card-content">
          <div className="evaluation-image-column">
            {currentOutput ? (
              <div className="evaluation-image-wrapper">
                <img
                  className="evaluation-main-image"
                  src={resolveAssetUrl(currentOutput.resultImage)}
                  alt={imageAlt}
                  loading="lazy"
                />
                <a
                  className="evaluation-download-btn"
                  href={resolveProxyAssetUrl(currentOutput.resultImage)}
                  download={`${job.garmentName}-${job.id}.jpg`}
                  title="Descargar imagen"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </a>
              </div>
            ) : (
              <div className="empty-thumb evaluation-empty">{emptyMessage}</div>
            )}

            {showProcessingHint && job.status !== 'completed' && currentOutput ? (
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
                onChange={(event) => onUpdateDraft(job.id, { provider: event.target.value as ProviderKey })}
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
                onChange={(event) => onUpdateDraft(job.id, { prompt: event.target.value })}
              />
            </div>

            <CButton color="dark" disabled={isRegenerating} onClick={() => onRegenerate(job)}>
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
};
