import { CBadge } from '../ui';
import type { JobStatus } from '../types/api';
import type { ColorKey } from '../ui';

interface StatusBadgeProps {
  status: JobStatus;
}

const colorByStatus: Record<JobStatus, ColorKey> = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'danger',
};

const labelByStatus: Record<JobStatus, string> = {
  pending: 'Pendiente',
  processing: 'Procesando',
  completed: 'Completado',
  failed: 'Fallido',
};

export const StatusBadge = ({ status }: StatusBadgeProps) => (
  <CBadge color={colorByStatus[status]} shape="rounded-pill" className="text-uppercase fw-semibold">
    {labelByStatus[status]}
  </CBadge>
);
