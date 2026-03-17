import { resolveAssetUrl } from '../services/api';

interface ImageThumbProps {
  src: string;
  alt: string;
}

export const ImageThumb = ({ src, alt }: ImageThumbProps) => (
  <img className="image-thumb" src={resolveAssetUrl(src)} alt={alt} loading="lazy" />
);
