import { BaseFalProvider } from './BaseFalProvider';

export class FalBananaProvider extends BaseFalProvider {
  public constructor() {
    super('fal-banana-pro', 'fal-ai/nano-banana-pro/edit');
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
      aspect_ratio: input.aspectRatio,
      resolution: '1K',
      output_format: 'png',
    };
  }
}
