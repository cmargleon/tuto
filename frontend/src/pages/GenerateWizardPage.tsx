import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
} from '../ui';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { ImageThumb } from '../components/ImageThumb';
import { LoadingBlock } from '../components/LoadingBlock';
import { PageHeader } from '../components/PageHeader';
import { WizardStepper } from '../components/WizardStepper';
import { DEFAULT_TRY_ON_PROMPT } from '../constants/tryOn';
import { defaultBackgroundConfig, normalizeBackgroundConfig } from '../features/background/backgroundConfig';
// backgroundConfig is kept with its default value — the UI step was removed
import { compositeGarmentImages, groupFilesBySubfolder } from '../features/garments/compositeGarmentImages';
import { uploadFilesToStorage } from '../features/storage/uploadFilesToStorage';
import {
  aspectRatioOptions,
  fetchClients,
  fetchModels,
  fetchStorageConfig,
  generateJobs,
  getApiErrorMessage,
  providerOptions,
  resolveAssetUrl,
} from '../services/api';
import type { AspectRatioKey, ClientRecord, ModelRecord, ProviderKey, StorageConfig } from '../types/api';

const steps = [
  'Cliente, modelo y poses',
  'Elegir prendas',
  'Elegir proveedor',
];

interface UploadedGarment {
  id: string;
  files: File[];
  name: string;
  previewUrls: string[];
}

const buildGarmentName = (filename: string): string => filename.replace(/\.[^.]+$/, '') || filename;

const formatClientDate = (value: string): string =>
  new Date(value).toLocaleDateString('es-MX', {
    dateStyle: 'medium',
  });

export const GenerateWizardPage = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [storageConfig, setStorageConfig] = useState<StorageConfig | null>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [selectedPoseIds, setSelectedPoseIds] = useState<number[]>([]);
  const [uploadedGarments, setUploadedGarments] = useState<UploadedGarment[]>([]);
  const backgroundConfig = defaultBackgroundConfig;
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatioKey>('3:4');
  const [selectedProvider, setSelectedProvider] = useState<ProviderKey | null>('fal-seedream');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [prompt, setPrompt] = useState(DEFAULT_TRY_ON_PROMPT);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [clientsResponse, modelsResponse, storageResponse] = await Promise.all([
          fetchClients(),
          fetchModels(),
          fetchStorageConfig(),
        ]);
        setClients(clientsResponse);
        setModels(modelsResponse);
        setStorageConfig(storageResponse);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    previewUrlsRef.current = uploadedGarments.flatMap((garment) => garment.previewUrls);
  }, [uploadedGarments]);

  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((previewUrl) => {
        URL.revokeObjectURL(previewUrl);
      });
    },
    [],
  );

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId) ?? null,
    [models, selectedModelId],
  );

  const modelsForSelectedClient = useMemo(
    () => models.filter((model) => model.clientId === selectedClientId),
    [models, selectedClientId],
  );

  const totalJobs = selectedPoseIds.length * uploadedGarments.length;
  const isStepComplete = (step: number) => {
    switch (step) {
      case 1:
        return selectedClientId !== null && selectedModelId !== null && selectedPoseIds.length > 0;
      case 2:
        return uploadedGarments.length > 0;
      case 3:
        return selectedProvider !== null;
      default:
        return false;
    }
  };

  const toggleId = (currentIds: number[], id: number) =>
    currentIds.includes(id) ? currentIds.filter((currentId) => currentId !== id) : [...currentIds, id];

  const canAdvance = () => isStepComplete(currentStep);

  const canNavigateToStep = (targetStep: number) => {
    if (targetStep <= currentStep) {
      return true;
    }

    for (let step = 1; step < targetStep; step += 1) {
      if (!isStepComplete(step)) {
        return false;
      }
    }

    return true;
  };

  const handleStepSelect = (targetStep: number) => {
    if (!canNavigateToStep(targetStep)) {
      return;
    }

    setCurrentStep(targetStep);
  };

  const handleClientSelect = (clientId: number) => {
    setSelectedClientId(clientId);
    setSelectedModelId(null);
    setSelectedPoseIds([]);
    setModelMenuOpen(true);
    setSuccess(null);
  };

  const handleModelSelect = (modelId: number) => {
    setSelectedModelId(modelId);
    setSelectedPoseIds([]);
    setModelMenuOpen(false);
    setSuccess(null);
  };

  const toggleAllSelectedPoses = () => {
    if (!selectedModel) {
      return;
    }

    const allPoseIds = selectedModel.images.map((image) => image.id);
    const allSelected = allPoseIds.length > 0 && allPoseIds.every((imageId) => selectedPoseIds.includes(imageId));

    setSelectedPoseIds(allSelected ? [] : allPoseIds);
  };

  const handleGarmentsUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((f) => f.type.startsWith('image/'));

    if (files.length === 0) {
      return;
    }

    setUploadedGarments((currentGarments) => [
      ...currentGarments,
      ...files.map((file) => ({
        id: crypto.randomUUID(),
        files: [file],
        name: buildGarmentName(file.name),
        previewUrls: [URL.createObjectURL(file)],
      })),
    ]);
    setSuccess(null);
    event.target.value = '';
  };

  const handleFolderUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const allFiles = Array.from(event.target.files ?? []);

    if (allFiles.length === 0) {
      return;
    }

    const groups = groupFilesBySubfolder(allFiles);

    if (groups.length === 0) {
      return;
    }

    setUploadedGarments((currentGarments) => [
      ...currentGarments,
      ...groups.map(({ name, files: groupFiles }) => ({
        id: crypto.randomUUID(),
        files: groupFiles,
        name,
        previewUrls: groupFiles.map((f) => URL.createObjectURL(f)),
      })),
    ]);
    setSuccess(null);
    event.target.value = '';
  };

  const handleRemoveGarment = (garmentId: string) => {
    setUploadedGarments((currentGarments) => {
      const garmentToRemove = currentGarments.find((garment) => garment.id === garmentId);

      if (garmentToRemove) {
        garmentToRemove.previewUrls.forEach((url) => URL.revokeObjectURL(url));
      }

      return currentGarments.filter((garment) => garment.id !== garmentId);
    });
    setSuccess(null);
  };

  const handleGenerate = async () => {
    if (!selectedClientId || !selectedModelId || !selectedProvider) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const garmentIsMultiAngle = uploadedGarments.map((g) => g.files.length > 1);
      const compositeFiles = await Promise.all(uploadedGarments.map((g) => compositeGarmentImages(g.files)));
      const uploadedGarmentsForRequest = await uploadFilesToStorage(storageConfig, 'garments', compositeFiles);

      const response = await generateJobs({
        clientId: selectedClientId,
        modelId: selectedModelId,
        poseImageIds: selectedPoseIds,
        garments: compositeFiles,
        uploadedGarments: uploadedGarmentsForRequest,
        garmentIsMultiAngle,
        aspectRatio: selectedAspectRatio,
        provider: selectedProvider,
        prompt,
        backgroundConfig: normalizeBackgroundConfig(backgroundConfig),
      });

      setSuccess(`${response.createdJobs} trabajos creados y enviados a la cola del proceso en segundo plano.`);
      window.setTimeout(() => navigate('/evaluacion'), 900);
    } catch (generateError) {
      setError(getApiErrorMessage(generateError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Generar imágenes"
        description="Arranca cada lote eligiendo un cliente, luego combina sus prendas temporales con las poses del modelo y genera una imagen por cada combinación."
      />

      <CCard className="studio-card">
        <CCardHeader className="border-0 bg-transparent pt-4">
          <WizardStepper
            currentStep={currentStep}
            steps={steps}
            onStepSelect={handleStepSelect}
            canSelectStep={canNavigateToStep}
          />
        </CCardHeader>
        <CCardBody>
          {loading ? <LoadingBlock /> : null}
          {error ? <CAlert color="danger">{error}</CAlert> : null}
          {success ? <CAlert color="success">{success}</CAlert> : null}

          {!loading && clients.length === 0 ? (
            <EmptyState
              title="Primero necesitas clientes"
              description="Crea al menos un cliente desde la sección Clientes antes de generar un nuevo lote."
            />
          ) : null}

          {!loading && clients.length > 0 && models.length === 0 ? (
            <EmptyState
              title="Primero necesitas modelos"
              description="Crea al menos un modelo con poses subidas antes de generar trabajos."
            />
          ) : null}

          {!loading && clients.length > 0 && models.length > 0 ? (
            <>
              {currentStep === 1 ? (
                <div className="d-grid gap-4">
                  <CCard className="summary-card">
                    <CCardBody className="d-grid gap-4">
                      <CRow className="g-4 align-items-start">
                        <CCol lg={4}>
                          <div className="d-grid gap-2">
                            <CFormLabel htmlFor="wizard-client">Cliente</CFormLabel>
                            <CFormSelect
                              id="wizard-client"
                              value={selectedClientId ?? ''}
                              onChange={(event) => {
                                const nextClientId = event.target.value ? Number(event.target.value) : null;

                                if (nextClientId === null) {
                                  setSelectedClientId(null);
                                  setSelectedModelId(null);
                                  setSelectedPoseIds([]);
                                  setModelMenuOpen(false);
                                  return;
                                }

                                handleClientSelect(nextClientId);
                              }}
                            >
                              <option value="">Selecciona un cliente</option>
                              {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                  {client.name}
                                </option>
                              ))}
                            </CFormSelect>
                            {selectedClient ? (
                              <div className="text-body-secondary small">
                                Cliente activo: <strong>{selectedClient.name}</strong>.
                              </div>
                            ) : null}
                          </div>
                        </CCol>

                        <CCol lg={8}>
                          <div className="d-grid gap-2">
                            <CFormLabel>Modelo</CFormLabel>
                            {!selectedClientId ? (
                              <EmptyState
                                title="Primero elige un cliente"
                                description="El selector de modelos se habilita cuando eliges el cliente al que pertenece el lote."
                              />
                            ) : modelsForSelectedClient.length === 0 ? (
                              <EmptyState
                                title="Este cliente aún no tiene modelos"
                                description="Crea un modelo para este cliente y luego vuelve al wizard."
                              />
                            ) : (
                              <div className="wizard-model-picker">
                                <button
                                  type="button"
                                  className={`wizard-model-trigger ${modelMenuOpen ? 'open' : ''}`}
                                  onClick={() => {
                                    if (modelsForSelectedClient.length > 0) {
                                      setModelMenuOpen((open) => !open);
                                    }
                                  }}
                                >
                                  {selectedModel ? (
                                    <>
                                      {selectedModel.images[0] ? (
                                        <img
                                          className="wizard-model-trigger-thumb"
                                          src={resolveAssetUrl(selectedModel.images[0].filePath)}
                                          alt={selectedModel.name}
                                        />
                                      ) : (
                                        <div className="wizard-model-trigger-placeholder">Sin foto</div>
                                      )}
                                      <div className="wizard-model-trigger-copy">
                                        <strong>{selectedModel.name}</strong>
                                        <span>{selectedModel.images.length} poses disponibles</span>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="wizard-model-trigger-copy">
                                      <strong>Selecciona un modelo</strong>
                                      <span>Solo aparecen modelos ligados al cliente elegido</span>
                                    </div>
                                  )}
                                </button>

                                {modelMenuOpen ? (
                                  <div className="wizard-model-menu">
                                    {modelsForSelectedClient.map((model) => (
                                      <button
                                        key={model.id}
                                        type="button"
                                        className={`wizard-model-option ${selectedModelId === model.id ? 'selected' : ''}`}
                                        onClick={() => handleModelSelect(model.id)}
                                      >
                                        {model.images[0] ? (
                                          <img
                                            className="wizard-model-option-thumb"
                                            src={resolveAssetUrl(model.images[0].filePath)}
                                            alt={model.name}
                                          />
                                        ) : (
                                          <div className="wizard-model-option-placeholder">Sin foto</div>
                                        )}
                                        <div className="wizard-model-option-copy">
                                          <strong>{model.name}</strong>
                                          <span>
                                            {model.images.length} poses · Alta {formatClientDate(model.createdAt)}
                                          </span>
                                        </div>
                                        <CFormCheck readOnly checked={selectedModelId === model.id} />
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </CCol>
                      </CRow>
                    </CCardBody>
                  </CCard>

                  {selectedClientId && selectedModel ? (
                    selectedModel.images.length > 0 ? (
                      <>
                        <div className="text-body-secondary">
                          Elige una o más poses de <strong>{selectedModel.name}</strong> para el cliente{' '}
                          <strong>{selectedClient?.name ?? 'seleccionado'}</strong>.
                        </div>
                        <div className="d-flex justify-content-end">
                          <CButton type="button" color="secondary" variant="outline" onClick={toggleAllSelectedPoses}>
                            {selectedModel.images.length > 0 && selectedModel.images.every((image) => selectedPoseIds.includes(image.id))
                              ? 'Deseleccionar todas las fotos'
                              : 'Seleccionar todas las fotos'}
                          </CButton>
                        </div>
                        <div className="selection-grid">
                          {selectedModel.images.map((image) => (
                            <button
                              key={image.id}
                              type="button"
                              className={`selection-card ${selectedPoseIds.includes(image.id) ? 'selected' : ''}`}
                              onClick={() => setSelectedPoseIds((currentIds) => toggleId(currentIds, image.id))}
                            >
                              <div className="d-flex justify-content-between align-items-start mb-3">
                                <strong>Pose #{image.id}</strong>
                                <CFormCheck readOnly checked={selectedPoseIds.includes(image.id)} />
                              </div>
                              <ImageThumb src={image.filePath} alt={`Pose ${image.id}`} />
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <EmptyState
                        title="Este modelo no tiene imágenes de pose"
                        description="Vuelve a Modelos y sube referencias de pose antes de continuar."
                      />
                    )
                  ) : null}
                </div>
              ) : null}

              {currentStep === 2 ? (
                <div className="upload-panel">
                  <div className="upload-panel-copy">
                    <h4 className="mb-2">Carga las prendas para este lote</h4>
                    <p className="text-body-secondary mb-0">
                      Las prendas se guardarán como parte de los trabajos del cliente <strong>{selectedClient?.name ?? '-'}</strong>,
                      sin pasar por una biblioteca persistente.
                    </p>
                  </div>

                  <div className="d-flex gap-3">
                    <CFormLabel htmlFor="garment-upload" className="upload-dropzone" style={{ flex: 1 }}>
                      <span className="upload-dropzone-title">Agregar imágenes individuales</span>
                      <span className="upload-dropzone-copy">
                        Cada archivo = una prenda con una sola foto de referencia.
                      </span>
                      <CFormInput
                        id="garment-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        className="d-none"
                        onChange={handleGarmentsUpload}
                      />
                    </CFormLabel>

                    <CFormLabel htmlFor="folder-upload" className="upload-dropzone" style={{ flex: 1 }}>
                      <span className="upload-dropzone-title">Agregar desde carpeta</span>
                      <span className="upload-dropzone-copy">
                        Cada subcarpeta = una prenda. Las fotos dentro se combinarán en una sola imagen de referencia.
                      </span>
                      <CFormInput
                        id="folder-upload"
                        type="file"
                        className="d-none"
                        onChange={handleFolderUpload}
                        // @ts-expect-error webkitdirectory is not in React's types
                        webkitdirectory=""
                        directory=""
                      />
                    </CFormLabel>
                  </div>

                  {uploadedGarments.length === 0 ? (
                    <EmptyState
                      title="Aún no has subido prendas"
                      description="Añade una o varias imágenes de producto para continuar con el lote."
                    />
                  ) : (
                    <div className="selection-grid">
                      {uploadedGarments.map((garment) => (
                        <div key={garment.id} className="selection-card uploaded-garment-card selected">
                          <div className="d-flex justify-content-between align-items-start mb-3 gap-3">
                            <div>
                              <strong>{garment.name}</strong>
                              <div className="text-body-secondary small">
                                {garment.files.length === 1
                                  ? garment.files[0].name
                                  : `${garment.files.length} fotos · imagen compuesta`}
                              </div>
                            </div>
                            <CButton
                              type="button"
                              color="secondary"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveGarment(garment.id)}
                            >
                              Quitar
                            </CButton>
                          </div>
                          {garment.previewUrls.length === 1 ? (
                            <img className="image-thumb" src={garment.previewUrls[0]} alt={garment.name} loading="lazy" />
                          ) : (
                            <div className="d-flex gap-1 overflow-hidden" style={{ borderRadius: '6px' }}>
                              {garment.previewUrls.map((url, i) => (
                                <img
                                  key={url}
                                  src={url}
                                  alt={`Vista ${i + 1}`}
                                  loading="lazy"
                                  style={{ flex: 1, minWidth: 0, height: '120px', objectFit: 'cover' }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {currentStep === 3 ? (
                <CRow className="g-4">
                  <CCol lg={7}>
                    <div className="d-grid gap-4">
                      <CCard className="summary-card">
                        <CCardBody>
                          <CRow className="g-3 align-items-end">
                            <CCol lg={4}>
                              <CFormLabel htmlFor="aspect-ratio">Proporción de salida</CFormLabel>
                              <CFormSelect
                                id="aspect-ratio"
                                value={selectedAspectRatio}
                                onChange={(event) => setSelectedAspectRatio(event.target.value as AspectRatioKey)}
                              >
                                {aspectRatioOptions.map((option) => (
                                  <option key={option.key} value={option.key}>
                                    {option.label}
                                  </option>
                                ))}
                              </CFormSelect>
                            </CCol>

                            <CCol lg={8}>
                              <div className="text-body-secondary small">
                                Esta proporción se aplicará a todo el lote. La predeterminada es <strong>3:4</strong>.
                              </div>
                            </CCol>
                          </CRow>
                        </CCardBody>
                      </CCard>

                      <div className="selection-grid provider-grid">
                        {providerOptions.map((provider) => (
                          <button
                            key={provider.key}
                            type="button"
                            className={`selection-card provider-card ${selectedProvider === provider.key ? 'selected' : ''}`}
                            onClick={() => setSelectedProvider(provider.key)}
                          >
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <strong>{provider.label}</strong>
                              <CFormCheck readOnly checked={selectedProvider === provider.key} />
                            </div>
                            <p className="mb-0 text-body-secondary">{provider.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CCol>

                  <CCol lg={5}>
                    <div className="d-grid gap-4">
                      <CCard className="summary-card">
                        <CCardBody>
                          <h4 className="mb-3">Prompt base del lote</h4>
                          <CFormTextarea rows={8} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
                          <p className="text-body-secondary mb-0 mt-3">
                            Luego podrás ajustar este prompt individualmente desde la pantalla de evaluación y volver a generar cualquier tarjeta del cliente.
                          </p>
                        </CCardBody>
                      </CCard>
                    </div>
                  </CCol>
                </CRow>
              ) : null}

              <div className="wizard-actions">
                <CButton
                  type="button"
                  color="secondary"
                  variant="ghost"
                  disabled={currentStep === 1}
                  onClick={() => setCurrentStep((step) => Math.max(1, step - 1))}
                >
                  Atrás
                </CButton>

                {currentStep < steps.length ? (
                  <CButton
                    type="button"
                    color="dark"
                    disabled={!canAdvance()}
                    onClick={() => setCurrentStep((step) => Math.min(steps.length, step + 1))}
                  >
                    Continuar
                  </CButton>
                ) : (
                  <CButton
                    type="button"
                    color="dark"
                    disabled={submitting || totalJobs === 0 || selectedProvider === null}
                    onClick={() => void handleGenerate()}
                  >
                    {submitting ? 'Generando trabajos...' : `Crear ${totalJobs} trabajos`}
                  </CButton>
                )}
              </div>
            </>
          ) : null}
        </CCardBody>
      </CCard>
    </>
  );
};
