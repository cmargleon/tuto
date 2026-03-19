// Cost per completed image in USD for each provider.
// Update these values when pricing changes.
//
// Sources (March 2026):
//   fal-seedream      → fal.ai Seedream v4   flat $0.03/image
//   fal-banana-pro    → fal.ai nano-banana-pro standard $0.15/image
//   openai-gpt-image-1.5 → gpt-image-1.5 medium quality ~$0.04/image
//                         (token-based; actual cost varies by quality tier and size,
//                          $0.009 low / $0.034 medium / $0.133 high at 1024×1024)
export const PROVIDER_COST_USD: Record<string, number> = {
  'fal-seedream': 0.03,
  'fal-banana-pro': 0.15,
  'openai-gpt-image-1.5': 0.04,
};
