import { CAlert, CCard, CCardBody, CCardHeader, CFormCheck, CFormLabel, CFormRange, CFormSelect, CFormTextarea } from '../../ui';
import { BackgroundSummary } from './BackgroundSummary';
import {
  backgroundContrastSelectOptions,
  backgroundDominantColorSelectOptions,
  backgroundLightingSelectOptions,
  backgroundModeSelectOptions,
  backgroundProminenceSelectOptions,
  backgroundRealismSelectOptions,
  backgroundSceneSelectOptions,
  backgroundSeparationSelectOptions,
  getBackgroundValidationMessages,
  normalizeBackgroundConfig,
  type BackgroundConfig,
} from '../../features/background/backgroundConfig';

interface BackgroundStepProps {
  value: BackgroundConfig;
  onChange: (nextValue: BackgroundConfig) => void;
}

export const BackgroundStep = ({ value, onChange }: BackgroundStepProps) => {
  const normalizedValue = normalizeBackgroundConfig(value);
  const validationMessages = getBackgroundValidationMessages(normalizedValue);
  const hideAdvancedFields = normalizedValue.mode === 'white';

  const updateField = <K extends keyof BackgroundConfig>(key: K, nextValue: BackgroundConfig[K]) => {
    onChange(
      normalizeBackgroundConfig({
        ...normalizedValue,
        [key]: nextValue,
      }),
    );
  };

  return (
    <div className="background-step-layout">
      <div className="background-step-main">
        <CCard className="studio-card">
          <CCardHeader className="border-0 bg-transparent pt-4">
            <div>
              <h4 className="mb-1">Fondo</h4>
              <p className="text-body-secondary mb-0">
                Configura el estilo del fondo para construir instrucciones consistentes en el prompt sin mezclar opciones incompatibles.
              </p>
            </div>
          </CCardHeader>

          <CCardBody className="d-grid gap-4">
            {validationMessages.length > 0 ? (
              <CAlert color="warning" className="mb-0">
                <div className="d-grid gap-2">
                  {validationMessages.map((message) => (
                    <span key={message}>{message}</span>
                  ))}
                </div>
              </CAlert>
            ) : null}

            <div className="background-advanced-grid">
              <div className="background-field">
                <CFormLabel>Modo de fondo</CFormLabel>
                <CFormSelect
                  value={normalizedValue.mode}
                  onChange={(event) => updateField('mode', event.target.value as BackgroundConfig['mode'])}
                >
                  {backgroundModeSelectOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </div>

              {!hideAdvancedFields ? (
                <div className="background-field">
                  <CFormLabel>Escenario</CFormLabel>
                  <CFormSelect
                    value={normalizedValue.scene}
                    onChange={(event) => updateField('scene', event.target.value as BackgroundConfig['scene'])}
                  >
                    {backgroundSceneSelectOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
              ) : null}

              <div className="background-field">
                <CFormLabel>Luz</CFormLabel>
                <CFormSelect
                  value={normalizedValue.lighting}
                  onChange={(event) => updateField('lighting', event.target.value as BackgroundConfig['lighting'])}
                >
                  {backgroundLightingSelectOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </div>

              {!hideAdvancedFields ? (
                <div className="background-field">
                  <div className="background-field-head">
                    <CFormLabel className="mb-0">Fuerza del bokeh</CFormLabel>
                    <strong>{normalizedValue.bokehStrength}%</strong>
                  </div>
                  <CFormRange
                    min={0}
                    max={100}
                    step={1}
                    value={normalizedValue.bokehStrength}
                    onChange={(event) => updateField('bokehStrength', Number(event.target.value))}
                  />
                </div>
              ) : null}

              {!hideAdvancedFields ? (
                <div className="background-field">
                  <CFormLabel>Color dominante</CFormLabel>
                  <CFormSelect
                    value={normalizedValue.dominantColor}
                    onChange={(event) => updateField('dominantColor', event.target.value as BackgroundConfig['dominantColor'])}
                  >
                    {backgroundDominantColorSelectOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
              ) : null}

              {!hideAdvancedFields ? (
                <div className="background-field">
                  <CFormLabel>Protagonismo del fondo</CFormLabel>
                  <CFormSelect
                    value={normalizedValue.prominence}
                    onChange={(event) => updateField('prominence', event.target.value as BackgroundConfig['prominence'])}
                  >
                    {backgroundProminenceSelectOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
              ) : null}

              {!hideAdvancedFields ? (
                <div className="background-field">
                  <CFormLabel>Contraste</CFormLabel>
                  <CFormSelect
                    value={normalizedValue.contrast}
                    onChange={(event) => updateField('contrast', event.target.value as BackgroundConfig['contrast'])}
                  >
                    {backgroundContrastSelectOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
              ) : null}

              {!hideAdvancedFields ? (
                <div className="background-field">
                  <CFormLabel>Realismo</CFormLabel>
                  <CFormSelect
                    value={normalizedValue.realism}
                    onChange={(event) => updateField('realism', event.target.value as BackgroundConfig['realism'])}
                  >
                    {backgroundRealismSelectOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
              ) : null}

              <div className="background-field">
                <CFormLabel>Separación sujeto/fondo</CFormLabel>
                <CFormSelect
                  value={normalizedValue.separation}
                  onChange={(event) => updateField('separation', event.target.value as BackgroundConfig['separation'])}
                >
                  {backgroundSeparationSelectOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </div>

              {!hideAdvancedFields ? (
                <label className="form-check">
                  <CFormCheck
                    checked={normalizedValue.avoidExtraPeople}
                    onChange={(event) => updateField('avoidExtraPeople', event.target.checked)}
                  />
                  <span>Sin gente extra</span>
                </label>
              ) : null}

              {!hideAdvancedFields ? (
                <label className="form-check">
                  <CFormCheck
                    checked={normalizedValue.avoidDistractingProps}
                    onChange={(event) => updateField('avoidDistractingProps', event.target.checked)}
                  />
                  <span>Sin props distractores</span>
                </label>
              ) : null}

              <label className="form-check">
                <CFormCheck
                  checked={normalizedValue.avoidTextSignage}
                  onChange={(event) => updateField('avoidTextSignage', event.target.checked)}
                />
                <span>Sin texto o señalética</span>
              </label>
            </div>

            <div className="background-field">
              <CFormLabel>Detalle extra de fondo</CFormLabel>
              <CFormTextarea
                rows={4}
                value={normalizedValue.customDetail}
                onChange={(event) => updateField('customDetail', event.target.value)}
              />
            </div>
          </CCardBody>
        </CCard>
      </div>

      <div className="background-step-sidebar">
        <BackgroundSummary config={normalizedValue} title="Resumen visual" />
      </div>
    </div>
  );
};
