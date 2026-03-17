import { CBadge, CCard, CCardBody } from '../../ui';
import {
  buildBackgroundSummaryItems,
  type BackgroundConfig,
} from '../../features/background/backgroundConfig';

interface BackgroundSummaryProps {
  config: BackgroundConfig;
  title?: string;
}

export const BackgroundSummary = ({ config, title = 'Resumen de fondo' }: BackgroundSummaryProps) => {
  const summaryItems = buildBackgroundSummaryItems(config);

  return (
    <CCard className="summary-card background-summary-card">
      <CCardBody>
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <h4 className="mb-1">{title}</h4>
            <p className="text-body-secondary mb-0">Vista rápida de la dirección visual que se enviará al backend.</p>
          </div>
          <CBadge color="success" shape="rounded-pill">
            Activo
          </CBadge>
        </div>

        <div className="background-summary-grid">
          {summaryItems.map((item) => (
            <div key={item.label} className="background-summary-item">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </CCardBody>
    </CCard>
  );
};
