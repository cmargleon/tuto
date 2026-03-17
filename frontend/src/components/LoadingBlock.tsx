import { CSpinner } from '../ui';

export const LoadingBlock = () => (
  <div className="loading-block">
    <CSpinner color="secondary" />
    <span>Cargando datos...</span>
  </div>
);
