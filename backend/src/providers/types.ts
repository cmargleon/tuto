import type { AspectRatioKey, ProviderKey } from '../types/domain';

export interface ImageProviderInput {
  poseImagePath: string;
  garmentImagePath: string;
  prompt: string;
  aspectRatio: AspectRatioKey;
}

export interface ImageProviderResult {
  localFilePath: string;
  remoteUrl: string | null;
  rawResponse: unknown;
  provider: ProviderKey;
}

export interface ImageProvider {
  readonly provider: ProviderKey;
  generate(input: ImageProviderInput): Promise<ImageProviderResult>;
}
