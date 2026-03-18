import { CButton } from '../../ui';
import type { GarmentSlide } from '../../features/jobs/jobBatches';
import { resolveAssetUrl } from '../../services/api';

interface GarmentCarouselControlsProps {
  activeSlideIndex: number;
  slides: GarmentSlide[];
  onSelectSlide: (index: number) => void;
}

export const GarmentCarouselControls = ({
  activeSlideIndex,
  slides,
  onSelectSlide,
}: GarmentCarouselControlsProps) => {
  const activeSlide = activeSlideIndex >= 0 ? slides[activeSlideIndex] : slides[0] ?? null;

  if (!activeSlide) {
    return null;
  }

  return (
    <div className="evaluation-carousel-controls">
      <CButton
        color="secondary"
        variant="outline"
        disabled={activeSlideIndex <= 0}
        onClick={() => onSelectSlide(activeSlideIndex - 1)}
      >
        Prenda anterior
      </CButton>

      <div className="evaluation-carousel-control-summary">
        <div className="evaluation-carousel-control-thumbs">
          {slides.map((slide, index) => (
            <button
              key={slide.key}
              type="button"
              className={`evaluation-carousel-control-thumb-button ${slide.key === activeSlide.key ? 'is-active' : ''}`}
              onClick={() => onSelectSlide(index)}
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
          Prenda {activeSlideIndex + 1} de {slides.length} · {activeSlide.jobs.length} pose
          {activeSlide.jobs.length === 1 ? '' : 's'}
        </span>
      </div>

      <CButton
        color="secondary"
        variant="outline"
        disabled={activeSlideIndex >= slides.length - 1}
        onClick={() => onSelectSlide(activeSlideIndex + 1)}
      >
        Siguiente prenda
      </CButton>
    </div>
  );
};
