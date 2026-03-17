import type { ProviderKey } from '../types/domain';
import { AppError } from '../utils/appError';
import { FalBananaProvider } from './FalBananaProvider';
import { FalSeedreamProvider } from './FalSeedreamProvider';
import { OpenAIImageProvider } from './OpenAIImageProvider';
import type { ImageProvider } from './types';

const providers: Record<ProviderKey, ImageProvider> = {
  'fal-seedream': new FalSeedreamProvider(),
  'fal-banana-pro': new FalBananaProvider(),
  'openai-gpt-image-1.5': new OpenAIImageProvider(),
};

export const getImageProvider = (provider: ProviderKey): ImageProvider => {
  const selectedProvider = providers[provider];

  if (!selectedProvider) {
    throw new AppError(`Proveedor no compatible: ${provider}`, 400);
  }

  return selectedProvider;
};
