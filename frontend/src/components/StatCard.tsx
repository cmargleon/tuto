import type { SvgIconComponent } from '@mui/icons-material';
import { CCard, CCardBody } from '../ui';

interface StatCardProps {
  label: string;
  value: number;
  icon: SvgIconComponent;
  tone?: 'accent' | 'cool';
}

export const StatCard = ({ label, value, icon: Icon, tone = 'accent' }: StatCardProps) => (
  <CCard className={`stat-card stat-card-${tone}`}>
    <CCardBody>
      <div className={`stat-icon stat-icon-${tone}`}>
        <Icon fontSize="medium" />
      </div>
      <p className="stat-label mb-2">{label}</p>
      <h2 className="stat-value mb-0">{value}</h2>
    </CCardBody>
  </CCard>
);
