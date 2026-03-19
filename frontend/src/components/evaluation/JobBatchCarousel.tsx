import { EmptyState } from '../EmptyState';
import { resolveAssetUrl } from '../../services/api';
import type { JobRecord } from '../../types/api';
import type { JobDraft } from '../../features/jobs/jobDrafts';
import { useGarmentCarousel } from '../../features/jobs/useGarmentCarousel';
import { GarmentCarouselControls } from './GarmentCarouselControls';
import { JobEvaluationCard } from './JobEvaluationCard';

interface JobBatchCarouselProps {
  emptyDescription: string;
  emptyTitle: string;
  getEmptyMessage: (job: JobRecord) => string;
  jobDrafts: Record<number, JobDraft>;
  jobs: JobRecord[];
  queueingJobIds: number[];
  showFloatingGarment?: boolean;
  showProcessingHint?: boolean;
  onRegenerate: (job: JobRecord) => void;
  onUpdateDraft: (jobId: number, patch: Partial<JobDraft>) => void;
}

export const JobBatchCarousel = ({
  emptyDescription,
  emptyTitle,
  getEmptyMessage,
  jobDrafts,
  jobs,
  queueingJobIds,
  showFloatingGarment = false,
  showProcessingHint = false,
  onRegenerate,
  onUpdateDraft,
}: JobBatchCarouselProps) => {
  const { activeSlide, activeSlideIndex, garmentSlides, goToSlide } = useGarmentCarousel(jobs);

  if (!activeSlide) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="evaluation-carousel-layout">
      <GarmentCarouselControls activeSlideIndex={activeSlideIndex} slides={garmentSlides} onSelectSlide={goToSlide} />

      <div className="evaluation-slide-grid">
        {activeSlide.jobs.map((job, index) => {
          const draft = jobDrafts[job.id];
          const queueing = queueingJobIds.includes(job.id);

          if (!draft) {
            return null;
          }

          return (
            <JobEvaluationCard
              key={job.id}
              draft={draft}
              emptyMessage={getEmptyMessage(job)}
              imageAlt={`Resultado del trabajo ${job.id}`}
              job={job}
              queueing={queueing}
              showProcessingHint={showProcessingHint}
              subtitle={job.modelName}
              title={`Pose ${index + 1}`}
              onRegenerate={onRegenerate}
              onUpdateDraft={onUpdateDraft}
            />
          );
        })}
      </div>

      <GarmentCarouselControls activeSlideIndex={activeSlideIndex} slides={garmentSlides} onSelectSlide={goToSlide} />

      {showFloatingGarment ? (
        <div className="evaluation-floating-garment">
          <img src={resolveAssetUrl(activeSlide.garmentFilePath)} alt={activeSlide.garmentName} loading="lazy" />
        </div>
      ) : null}
    </div>
  );
};
