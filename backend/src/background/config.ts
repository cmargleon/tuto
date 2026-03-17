const backgroundModes = [
  'white',
  'bokeh',
  'studio',
  'exterior_natural',
  'exterior_urbano',
  'interior_lifestyle',
  'custom',
] as const;

const backgroundScenes = [
  'none',
  'arquitectura_moderna',
  'calle_limpia',
  'terraza',
  'fachada_neutra',
  'bosque',
  'mar',
  'sendero',
  'jardin',
  'campo',
  'living_minimalista',
  'estudio_creativo',
  'cafe_elegante',
  'vestidor',
  'gimnasio_premium',
  'papel_seamless',
  'cemento_suave',
] as const;

const backgroundLightingOptions = [
  'clear_soft_daylight',
  'warm_soft_daylight',
  'cool_soft_daylight',
  'studio_diffused',
  'high_key',
  'editorial',
  'dramatic',
  'overcast_soft',
  'golden_hour',
] as const;

const backgroundDominantColors = [
  'white',
  'neutral gray',
  'warm beige',
  'soft blue',
  'forest green',
  'ocean blue',
  'sand',
  'black',
] as const;

const backgroundProminenceOptions = ['minimal', 'medium', 'editorial'] as const;
const backgroundContrastOptions = ['soft', 'medium', 'high'] as const;
const backgroundRealismOptions = ['catalogo_realista', 'campana_lifestyle'] as const;
const backgroundSeparationOptions = ['standard', 'strong', 'maximum'] as const;

export type BackgroundMode = (typeof backgroundModes)[number];
export type BackgroundScene = (typeof backgroundScenes)[number];
export type BackgroundLighting = (typeof backgroundLightingOptions)[number];
export type BackgroundDominantColor = (typeof backgroundDominantColors)[number];
export type BackgroundProminence = (typeof backgroundProminenceOptions)[number];
export type BackgroundContrast = (typeof backgroundContrastOptions)[number];
export type BackgroundRealism = (typeof backgroundRealismOptions)[number];
export type BackgroundSeparation = (typeof backgroundSeparationOptions)[number];

export interface BackgroundConfig {
  mode: BackgroundMode;
  scene: BackgroundScene;
  lighting: BackgroundLighting;
  bokehStrength: number;
  dominantColor: BackgroundDominantColor;
  prominence: BackgroundProminence;
  contrast: BackgroundContrast;
  realism: BackgroundRealism;
  separation: BackgroundSeparation;
  avoidExtraPeople: boolean;
  avoidDistractingProps: boolean;
  avoidTextSignage: boolean;
  customDetail: string;
}

const defaultBackgroundConfig: BackgroundConfig = {
  mode: 'white',
  scene: 'none',
  lighting: 'clear_soft_daylight',
  bokehStrength: 45,
  dominantColor: 'white',
  prominence: 'minimal',
  contrast: 'soft',
  realism: 'catalogo_realista',
  separation: 'strong',
  avoidExtraPeople: true,
  avoidDistractingProps: true,
  avoidTextSignage: true,
  customDetail: '',
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const pickEnum = <T extends readonly string[]>(value: unknown, options: T, fallback: T[number]): T[number] =>
  typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T[number]) : fallback;

const pickBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const pickNumber = (value: unknown, fallback: number): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const normalizeBackgroundConfig = (input: unknown): BackgroundConfig => {
  const source = isRecord(input) ? input : {};
  const normalized: BackgroundConfig = {
    mode: pickEnum(source.mode, backgroundModes, defaultBackgroundConfig.mode),
    scene: pickEnum(source.scene, backgroundScenes, defaultBackgroundConfig.scene),
    lighting: pickEnum(source.lighting, backgroundLightingOptions, defaultBackgroundConfig.lighting),
    bokehStrength: clamp(pickNumber(source.bokehStrength, defaultBackgroundConfig.bokehStrength), 0, 100),
    dominantColor: pickEnum(source.dominantColor, backgroundDominantColors, defaultBackgroundConfig.dominantColor),
    prominence: pickEnum(source.prominence, backgroundProminenceOptions, defaultBackgroundConfig.prominence),
    contrast: pickEnum(source.contrast, backgroundContrastOptions, defaultBackgroundConfig.contrast),
    realism: pickEnum(source.realism, backgroundRealismOptions, defaultBackgroundConfig.realism),
    separation: pickEnum(source.separation, backgroundSeparationOptions, defaultBackgroundConfig.separation),
    avoidExtraPeople: pickBoolean(source.avoidExtraPeople, defaultBackgroundConfig.avoidExtraPeople),
    avoidDistractingProps: pickBoolean(source.avoidDistractingProps, defaultBackgroundConfig.avoidDistractingProps),
    avoidTextSignage: pickBoolean(source.avoidTextSignage, defaultBackgroundConfig.avoidTextSignage),
    customDetail: typeof source.customDetail === 'string' ? source.customDetail.trim() : '',
  };

  if (normalized.mode === 'white') {
    normalized.scene = 'none';
    normalized.bokehStrength = 0;
    normalized.dominantColor = 'white';
    normalized.prominence = 'minimal';
  }

  return normalized;
};

export const parseBackgroundConfig = (value: unknown): BackgroundConfig => {
  if (typeof value === 'string' && value.trim()) {
    try {
      return normalizeBackgroundConfig(JSON.parse(value) as unknown);
    } catch {
      return normalizeBackgroundConfig({});
    }
  }

  return normalizeBackgroundConfig(value);
};
