import { BaseFalProvider } from './BaseFalProvider';

const mapAspectRatioToSeedreamSize = (aspectRatio: string): string => {
  if (aspectRatio === '1:1') {
    return 'square_hd';
  }

  const [width, height] = aspectRatio.split(':').map(Number);

  if (Number.isFinite(width) && Number.isFinite(height) && width > height) {
    return 'landscape_16_9';
  }

  return 'portrait_16_9';
};

export class FalSeedreamProvider extends BaseFalProvider {
  public constructor() {
    super('fal-seedream', 'fal-ai/bytedance/seedream/v4/edit');
  }

  protected buildInput(input: {
    prompt: string;
    poseImageUrl: string;
    garmentImageUrl: string;
    aspectRatio: string;
  }): Record<string, unknown> {
    return {
      prompt: input.prompt,
      image_urls: [input.poseImageUrl, input.garmentImageUrl],
      num_images: 1,
      image_size: mapAspectRatioToSeedreamSize(input.aspectRatio),
    };
  }
}
