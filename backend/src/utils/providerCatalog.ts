import type { ProviderKey } from '../types/domain';

const providerKeys: ProviderKey[] = ['fal-seedream', 'fal-banana-pro', 'openai-gpt-image-1.5'];

export const isProviderKey = (value: string): value is ProviderKey =>
  providerKeys.includes(value as ProviderKey);
