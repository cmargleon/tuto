import type { BackgroundConfig } from './config';

const modeCopy: Record<BackgroundConfig['mode'], string> = {
  white: 'fondo blanco sólido limpio de catálogo',
  bokeh: 'fondo con bokeh controlado',
  studio: 'fondo de estudio comercial',
  exterior_natural: 'fondo exterior natural',
  exterior_urbano: 'fondo exterior urbano',
  interior_lifestyle: 'fondo interior lifestyle',
  custom: 'fondo personalizado',
};

const sceneCopy: Record<BackgroundConfig['scene'], string> = {
  none: 'sin escenario adicional',
  arquitectura_moderna: 'arquitectura moderna',
  calle_limpia: 'calle limpia',
  terraza: 'terraza',
  fachada_neutra: 'fachada neutra',
  bosque: 'bosque',
  mar: 'mar',
  sendero: 'sendero',
  jardin: 'jardín',
  campo: 'campo',
  living_minimalista: 'living minimalista',
  estudio_creativo: 'estudio creativo',
  cafe_elegante: 'café elegante',
  vestidor: 'vestidor',
  gimnasio_premium: 'gimnasio premium',
  papel_seamless: 'papel seamless',
  cemento_suave: 'cemento suave',
};

const lightingCopy: Record<BackgroundConfig['lighting'], string> = {
  clear_soft_daylight: 'luz clara suave',
  warm_soft_daylight: 'luz cálida suave',
  cool_soft_daylight: 'luz fría suave',
  studio_diffused: 'luz de estudio difusa',
  high_key: 'luz high key',
  editorial: 'luz editorial',
  dramatic: 'luz dramática',
  overcast_soft: 'luz de nublado suave',
  golden_hour: 'luz de golden hour',
};

const prominenceCopy: Record<BackgroundConfig['prominence'], string> = {
  minimal: 'protagonismo mínimo del fondo',
  medium: 'protagonismo medio del fondo',
  editorial: 'protagonismo editorial del fondo',
};

const contrastCopy: Record<BackgroundConfig['contrast'], string> = {
  soft: 'contraste suave',
  medium: 'contraste medio',
  high: 'contraste alto',
};

const realismCopy: Record<BackgroundConfig['realism'], string> = {
  catalogo_realista: 'realismo de catálogo',
  campana_lifestyle: 'realismo de campaña lifestyle',
};

const separationCopy: Record<BackgroundConfig['separation'], string> = {
  standard: 'separación sujeto-fondo estándar',
  strong: 'separación sujeto-fondo fuerte',
  maximum: 'separación sujeto-fondo máxima',
};

export const buildBackgroundPrompt = (backgroundConfig: BackgroundConfig): string => {
  const parts: string[] = [
    `Crear ${modeCopy[backgroundConfig.mode]}.`,
    `Usar ${lightingCopy[backgroundConfig.lighting]}.`,
    `Mantener ${separationCopy[backgroundConfig.separation]}.`,
  ];

  if (backgroundConfig.mode !== 'white') {
    parts.push(
      `Escenario: ${sceneCopy[backgroundConfig.scene]}.`,
      `Color dominante del fondo: ${backgroundConfig.dominantColor}.`,
      `Aplicar ${prominenceCopy[backgroundConfig.prominence]}.`,
      `Aplicar ${contrastCopy[backgroundConfig.contrast]}.`,
      `Buscar ${realismCopy[backgroundConfig.realism]}.`,
    );

    if (backgroundConfig.bokehStrength > 0) {
      parts.push(`Desenfoque tipo bokeh al ${backgroundConfig.bokehStrength}% en el fondo.`);
    }
  }

  if (backgroundConfig.avoidExtraPeople) {
    parts.push('No agregar gente extra.');
  }

  if (backgroundConfig.avoidDistractingProps) {
    parts.push('No agregar props distractores ni elementos que compitan con la prenda.');
  }

  if (backgroundConfig.avoidTextSignage) {
    parts.push('No agregar texto, rótulos ni señalética.');
  }

  if (backgroundConfig.customDetail) {
    parts.push(`Detalle extra de fondo: ${backgroundConfig.customDetail}.`);
  }

  return parts.join(' ');
};

export const buildNegativeBackgroundPrompt = (backgroundConfig: BackgroundConfig): string => {
  const negativeParts = [
    'fondos desordenados o sucios',
    'perspectivas de fondo rotas',
    'recortes deficientes alrededor de la persona',
  ];

  if (backgroundConfig.avoidExtraPeople) {
    negativeParts.push('gente extra');
  }

  if (backgroundConfig.avoidDistractingProps) {
    negativeParts.push('props distractores');
  }

  if (backgroundConfig.avoidTextSignage) {
    negativeParts.push('texto, señalética o carteles');
  }

  if (backgroundConfig.mode === 'white') {
    negativeParts.push('fondos grises, coloridos o con textura visible');
  }

  return negativeParts.join(', ');
};

export const buildGenerationPrompt = (prompt: string, backgroundConfig: BackgroundConfig): string => {
  const sections = [prompt.trim(), `Instrucciones de fondo: ${buildBackgroundPrompt(backgroundConfig)}`].filter(Boolean);
  const negativeBackgroundPrompt = buildNegativeBackgroundPrompt(backgroundConfig);

  if (negativeBackgroundPrompt) {
    sections.push(`Evitar en el fondo: ${negativeBackgroundPrompt}.`);
  }

  return sections.join('\n\n');
};
