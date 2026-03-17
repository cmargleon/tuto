interface EmptyStateProps {
  title: string;
  description: string;
}

export const EmptyState = ({ title, description }: EmptyStateProps) => (
  <div className="empty-state">
    <h3>{title}</h3>
    <p className="mb-0">{description}</p>
  </div>
);
