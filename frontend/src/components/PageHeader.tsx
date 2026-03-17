import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <div className="page-header">
    <div>
      <p className="eyebrow mb-2">Estudio de prueba virtual</p>
      <h1 className="page-title">{title}</h1>
      <p className="page-description mb-0">{description}</p>
    </div>
    {actions ? <div className="page-actions">{actions}</div> : null}
  </div>
);
