import fs from 'node:fs/promises';
import mime from 'mime-types';
import { fal } from '@fal-ai/client';
import { env } from '../config/env';
import { downloadRemoteImage } from '../storage/fileStorage';
import type { ProviderKey } from '../types/domain';
import { AppError } from '../utils/appError';
import type { ImageProvider, ImageProviderInput, ImageProviderResult } from './types';

interface FalGenerationOutput {
  images?: Array<{
    url?: string;
  }>;
  image?: {
    url?: string;
  };
  url?: string;
}

export abstract class BaseFalProvider implements ImageProvider {
  public readonly provider: ProviderKey;
  protected readonly endpointId: string;

  protected constructor(provider: ProviderKey, endpointId: string) {
    this.provider = provider;
    this.endpointId = endpointId;
  }

  public async generate(input: ImageProviderInput): Promise<ImageProviderResult> {
    if (!env.falKey) {
      throw new AppError('FAL_KEY no está configurada. Agrégala al entorno antes de generar trabajos.', 500);
    }

    fal.config({ credentials: env.falKey });

    let response;

    try {
      const poseImageUrl = await this.uploadImage(input.poseImagePath);
      const garmentImageUrl = await this.uploadImage(input.garmentImagePath);
      response = await fal.subscribe(this.endpointId, {
        input: this.buildInput({
          prompt: input.prompt,
          poseImageUrl,
          garmentImageUrl,
          aspectRatio: input.aspectRatio,
        }),
        logs: true,
      });
    } catch (error) {
      throw new AppError(
        `No se pudo completar la solicitud a ${this.provider}. ${
          error instanceof Error ? error.message : 'Error desconocido del proveedor'
        }`,
        502,
      );
    }

    const remoteUrl = this.extractResultUrl(response.data as FalGenerationOutput);

    if (!remoteUrl) {
      throw new AppError(`El proveedor ${this.provider} no devolvió una URL de imagen.`, 502);
    }

    const storedImage = await downloadRemoteImage(remoteUrl, 'generated');

    return {
      localFilePath: storedImage.storagePath,
      remoteUrl,
      rawResponse: response.data,
      provider: this.provider,
    };
  }

  protected abstract buildInput(input: {
    prompt: string;
    poseImageUrl: string;
    garmentImageUrl: string;
    aspectRatio: string;
  }): Record<string, unknown>;

  private async uploadImage(localPath: string): Promise<string> {
    const buffer = await fs.readFile(localPath);
    const mimeType = mime.lookup(localPath) || 'application/octet-stream';
    const blob = new Blob([new Uint8Array(buffer)], { type: String(mimeType) });
    return fal.storage.upload(blob);
  }

  private extractResultUrl(output: FalGenerationOutput): string | null {
    return output.images?.[0]?.url ?? output.image?.url ?? output.url ?? null;
  }
}
