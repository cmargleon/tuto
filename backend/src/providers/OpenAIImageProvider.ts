import fs from 'node:fs';
import axios from 'axios';
import FormData from 'form-data';
import { env } from '../config/env';
import { downloadRemoteImage, saveBase64Image } from '../storage/fileStorage';
import { AppError } from '../utils/appError';
import type { ImageProvider, ImageProviderInput, ImageProviderResult } from './types';

interface OpenAIImageResponse {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
}

const mapAspectRatioToOpenAISize = (aspectRatio: string): string => {
  if (aspectRatio === '1:1') {
    return '1024x1024';
  }

  const [width, height] = aspectRatio.split(':').map(Number);

  if (Number.isFinite(width) && Number.isFinite(height) && width > height) {
    return '1536x1024';
  }

  return '1024x1536';
};

export class OpenAIImageProvider implements ImageProvider {
  public readonly provider = 'openai-gpt-image-1.5' as const;

  public async generate(input: ImageProviderInput): Promise<ImageProviderResult> {
    if (!env.openaiApiKey) {
      throw new AppError('OPENAI_API_KEY no está configurada. Agrégala al entorno antes de generar trabajos.', 500);
    }

    const formData = new FormData();
    formData.append('model', 'gpt-image-1.5');
    formData.append('prompt', input.prompt);
    formData.append('quality', 'high');
    formData.append('size', mapAspectRatioToOpenAISize(input.aspectRatio));
    formData.append('output_format', 'png');
    formData.append('input_fidelity', 'high');
    formData.append('image[]', fs.createReadStream(input.poseImagePath));
    formData.append('image[]', fs.createReadStream(input.garmentImagePath));

    let response;

    try {
      response = await axios.post<OpenAIImageResponse>(`${env.openaiBaseUrl}/images/edits`, formData, {
        headers: {
          Authorization: `Bearer ${env.openaiApiKey}`,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 120000,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const details =
          typeof error.response?.data === 'string'
            ? error.response.data
            : JSON.stringify(error.response?.data ?? { message: error.message });

        throw new AppError(`OpenAI devolvió un error al editar la imagen. ${details}`, 502);
      }

      throw new AppError(
        `No se pudo completar la solicitud a OpenAI. ${error instanceof Error ? error.message : 'Error desconocido.'}`,
        502,
      );
    }

    const firstImage = response.data.data?.[0];

    if (!firstImage) {
      throw new AppError('OpenAI no devolvió una imagen editada.', 502);
    }

    if (firstImage.b64_json) {
      const storedImage = await saveBase64Image(firstImage.b64_json, 'generated', 'png');

      return {
        localFilePath: storedImage.publicPath,
        remoteUrl: null,
        rawResponse: response.data,
        provider: this.provider,
      };
    }

    if (firstImage.url) {
      const storedImage = await downloadRemoteImage(firstImage.url, 'generated');

      return {
        localFilePath: storedImage.publicPath,
        remoteUrl: firstImage.url,
        rawResponse: response.data,
        provider: this.provider,
      };
    }

    throw new AppError('OpenAI devolvió una respuesta de imagen sin una salida utilizable.', 502);
  }
}
