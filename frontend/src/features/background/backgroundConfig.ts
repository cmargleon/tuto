import type {
  BackgroundConfig,
  BackgroundContrast,
  BackgroundDominantColor,
  BackgroundLighting,
  BackgroundMode,
  BackgroundProminence,
  BackgroundRealism,
  BackgroundScene,
  BackgroundSeparation,
} from '@tuto/shared';

export type {
  BackgroundConfig,
  BackgroundContrast,
  BackgroundDominantColor,
  BackgroundLighting,
  BackgroundMode,
  BackgroundProminence,
  BackgroundRealism,
  BackgroundScene,
  BackgroundSeparation,
};

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

const backgroundLightingOptionsList = [
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

interface SummaryItem {
  label: string;
  value: string;
}

interface Option<T extends string> {
  value: T;
  label: string;
}

export const defaultBackgroundConfig: BackgroundConfig = {
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

export const backgroundModeSelectOptions: Option<BackgroundMode>[] = [
  { value: 'white', label: 'Blanco sólido' },
  { value: 'bokeh', label: 'Bokeh' },
  { value: 'studio', label: 'Estudio' },
  { value: 'exterior_natural', label: 'Exterior natural' },
  { value: 'exterior_urbano', label: 'Exterior urbano' },
  { value: 'interior_lifestyle', label: 'Interior lifestyle' },
  { value: 'custom', label: 'Personalizado' },
];

export const backgroundSceneSelectOptions: Option<BackgroundScene>[] = [
  { value: 'none', label: 'Sin escenario' },
  { value: 'arquitectura_moderna', label: 'Arquitectura moderna' },
  { value: 'calle_limpia', label: 'Calle limpia' },
  { value: 'terraza', label: 'Terraza' },
  { value: 'fachada_neutra', label: 'Fachada neutra' },
  { value: 'bosque', label: 'Bosque' },
  { value: 'mar', label: 'Mar' },
  { value: 'sendero', label: 'Sendero' },
  { value: 'jardin', label: 'Jardín' },
  { value: 'campo', label: 'Campo' },
  { value: 'living_minimalista', label: 'Living minimalista' },
  { value: 'estudio_creativo', label: 'Estudio creativo' },
  { value: 'cafe_elegante', label: 'Café elegante' },
  { value: 'vestidor', label: 'Vestidor' },
  { value: 'gimnasio_premium', label: 'Gimnasio premium' },
  { value: 'papel_seamless', label: 'Papel seamless' },
  { value: 'cemento_suave', label: 'Cemento suave' },
];

export const backgroundLightingSelectOptions: Option<BackgroundLighting>[] = [
  { value: 'clear_soft_daylight', label: 'Luz clara suave' },
  { value: 'warm_soft_daylight', label: 'Luz cálida suave' },
  { value: 'cool_soft_daylight', label: 'Luz fría suave' },
  { value: 'studio_diffused', label: 'Estudio difuso' },
  { value: 'high_key', label: 'High key' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'dramatic', label: 'Dramática' },
  { value: 'overcast_soft', label: 'Nublado suave' },
  { value: 'golden_hour', label: 'Golden hour' },
];

export const backgroundDominantColorSelectOptions: Option<BackgroundDominantColor>[] = [
  { value: 'white', label: 'Blanco' },
  { value: 'neutral gray', label: 'Gris neutro' },
  { value: 'warm beige', label: 'Beige cálido' },
  { value: 'soft blue', label: 'Azul suave' },
  { value: 'forest green', label: 'Verde bosque' },
  { value: 'ocean blue', label: 'Azul mar' },
  { value: 'sand', label: 'Arena' },
  { value: 'black', label: 'Negro' },
];

export const backgroundProminenceSelectOptions: Option<BackgroundProminence>[] = [
  { value: 'minimal', label: 'Mínimo' },
  { value: 'medium', label: 'Medio' },
  { value: 'editorial', label: 'Editorial' },
];

export const backgroundContrastSelectOptions: Option<BackgroundContrast>[] = [
  { value: 'soft', label: 'Suave' },
  { value: 'medium', label: 'Medio' },
  { value: 'high', label: 'Alto' },
];

export const backgroundRealismSelectOptions: Option<BackgroundRealism>[] = [
  { value: 'catalogo_realista', label: 'Catálogo realista' },
  { value: 'campana_lifestyle', label: 'Campaña lifestyle' },
];

export const backgroundSeparationSelectOptions: Option<BackgroundSeparation>[] = [
  { value: 'standard', label: 'Estándar' },
  { value: 'strong', label: 'Fuerte' },
  { value: 'maximum', label: 'Máxima' },
];

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const pickEnum = <T extends readonly string[]>(value: unknown, options: T, fallback: T[number]): T[number] =>
  typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T[number]) : fallback;

const pickBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const labelFor = <T extends string>(value: T, options: Option<T>[]): string =>
  options.find((option) => option.value === value)?.label ?? value;

export const normalizeBackgroundConfig = (config: BackgroundConfig): BackgroundConfig => {
  const normalized: BackgroundConfig = {
    mode: pickEnum(config.mode, backgroundModes, defaultBackgroundConfig.mode),
    scene: pickEnum(config.scene, backgroundScenes, defaultBackgroundConfig.scene),
    lighting: pickEnum(config.lighting, backgroundLightingOptionsList, defaultBackgroundConfig.lighting),
    bokehStrength: clamp(Number(config.bokehStrength) || 0, 0, 100),
    dominantColor: pickEnum(config.dominantColor, backgroundDominantColors, defaultBackgroundConfig.dominantColor),
    prominence: pickEnum(config.prominence, backgroundProminenceOptions, defaultBackgroundConfig.prominence),
    contrast: pickEnum(config.contrast, backgroundContrastOptions, defaultBackgroundConfig.contrast),
    realism: pickEnum(config.realism, backgroundRealismOptions, defaultBackgroundConfig.realism),
    separation: pickEnum(config.separation, backgroundSeparationOptions, defaultBackgroundConfig.separation),
    avoidExtraPeople: pickBoolean(config.avoidExtraPeople, defaultBackgroundConfig.avoidExtraPeople),
    avoidDistractingProps: pickBoolean(config.avoidDistractingProps, defaultBackgroundConfig.avoidDistractingProps),
    avoidTextSignage: pickBoolean(config.avoidTextSignage, defaultBackgroundConfig.avoidTextSignage),
    customDetail: typeof config.customDetail === 'string' ? config.customDetail.trim() : '',
  };

  if (normalized.mode === 'white') {
    normalized.scene = 'none';
    normalized.bokehStrength = 0;
    normalized.dominantColor = 'white';
    normalized.prominence = 'minimal';
  }

  return normalized;
};

export const getBackgroundValidationMessages = (config: BackgroundConfig): string[] => {
  const normalized = normalizeBackgroundConfig(config);
  const messages: string[] = [];

  if (normalized.mode === 'white') {
    messages.push('En blanco sólido se desactivan escenario, bokeh y protagonismo extra del fondo.');
  }

  if (normalized.mode === 'custom' && !normalized.customDetail) {
    messages.push('En modo personalizado conviene agregar un detalle extra de fondo para orientar mejor el prompt.');
  }

  return messages;
};

export const buildBackgroundSummaryItems = (config: BackgroundConfig): SummaryItem[] => {
  const normalized = normalizeBackgroundConfig(config);
  const summaryItems: SummaryItem[] = [
    { label: 'Modo', value: labelFor(normalized.mode, backgroundModeSelectOptions) },
    { label: 'Luz', value: labelFor(normalized.lighting, backgroundLightingSelectOptions) },
    { label: 'Separación', value: labelFor(normalized.separation, backgroundSeparationSelectOptions) },
  ];

  if (normalized.mode !== 'white') {
    summaryItems.push(
      { label: 'Escenario', value: labelFor(normalized.scene, backgroundSceneSelectOptions) },
      { label: 'Bokeh', value: `${normalized.bokehStrength}%` },
      { label: 'Color dominante', value: labelFor(normalized.dominantColor, backgroundDominantColorSelectOptions) },
      { label: 'Protagonismo', value: labelFor(normalized.prominence, backgroundProminenceSelectOptions) },
      { label: 'Contraste', value: labelFor(normalized.contrast, backgroundContrastSelectOptions) },
      { label: 'Realismo', value: labelFor(normalized.realism, backgroundRealismSelectOptions) },
    );
  }

  summaryItems.push(
    { label: 'Gente extra', value: normalized.avoidExtraPeople ? 'No' : 'Permitida' },
    { label: 'Props distractores', value: normalized.avoidDistractingProps ? 'No' : 'Permitidos' },
    { label: 'Texto o señalética', value: normalized.avoidTextSignage ? 'No' : 'Permitidos' },
  );

  if (normalized.customDetail) {
    summaryItems.push({ label: 'Detalle extra', value: normalized.customDetail });
  }

  return summaryItems;
};
