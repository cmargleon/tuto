import { useEffect, useMemo, useState } from 'react';
import type { JobRecord } from '../../types/api';
import { buildGarmentSlides } from './jobBatches';

export const useGarmentCarousel = (jobs: JobRecord[]) => {
  const garmentSlides = useMemo(() => buildGarmentSlides(jobs), [jobs]);
  const [selectedGarmentKey, setSelectedGarmentKey] = useState<string | null>(null);

  useEffect(() => {
    if (garmentSlides.length === 0) {
      setSelectedGarmentKey(null);
      return;
    }

    const selectedSlideStillExists = selectedGarmentKey
      ? garmentSlides.some((slide) => slide.key === selectedGarmentKey)
      : false;

    if (!selectedSlideStillExists) {
      setSelectedGarmentKey(garmentSlides[0].key);
    }
  }, [garmentSlides, selectedGarmentKey]);

  const activeSlideIndex = selectedGarmentKey
    ? garmentSlides.findIndex((slide) => slide.key === selectedGarmentKey)
    : -1;
  const activeSlide = activeSlideIndex >= 0 ? garmentSlides[activeSlideIndex] : garmentSlides[0] ?? null;

  const goToSlide = (nextIndex: number) => {
    const nextSlide = garmentSlides[nextIndex];

    if (!nextSlide) {
      return;
    }

    setSelectedGarmentKey(nextSlide.key);
  };

  return {
    activeSlide,
    activeSlideIndex,
    garmentSlides,
    goToSlide,
  };
};
