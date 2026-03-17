import { FormEvent, useEffect, useState } from 'react';
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
} from '../ui';
import { EmptyState } from '../components/EmptyState';
import { ImageThumb } from '../components/ImageThumb';
import { LoadingBlock } from '../components/LoadingBlock';
import { PageHeader } from '../components/PageHeader';
import { createModel, deleteModel, fetchClients, fetchModels, getApiErrorMessage, updateModel } from '../services/api';
import type { ClientRecord, ModelRecord } from '../types/api';

const formatClientDate = (value: string): string =>
  new Date(value).toLocaleDateString('es-MX', {
    dateStyle: 'medium',
  });

export const ModelsPage = () => {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [name, setName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingModelId, setEditingModelId] = useState<number | null>(null);
  const [expandedModelId, setExpandedModelId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [savingModelId, setSavingModelId] = useState<number | null>(null);
  const [deletingModelId, setDeletingModelId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadPageData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [clientsResponse, modelsResponse] = await Promise.all([fetchClients(), fetchModels()]);
      setClients(clientsResponse);
      setModels(modelsResponse);
      setSelectedClientId((currentClientId) => {
        if (currentClientId && clientsResponse.some((client) => client.id === currentClientId)) {
          return currentClientId;
        }

        return clientsResponse[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPageData();
  }, []);

  const handleCreateModel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const imageInput = form.elements.namedItem('images') as HTMLInputElement | null;
    const files = imageInput?.files;

    if (!selectedClientId) {
      setError('Selecciona un cliente para el modelo.');
      return;
    }

    if (!files || files.length === 0) {
      setError('Debes subir al menos una imagen de pose antes de guardar el modelo.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      await createModel({
        name,
        clientId: selectedClientId,
        files,
      });
      setName('');
      form.reset();
      setSelectedClientId((currentClientId) => currentClientId ?? selectedClientId);
      setSuccess('Modelo creado con su cliente y sus poses iniciales.');
      await loadPageData();
    } catch (submitError) {
      setError(getApiErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (model: ModelRecord) => {
    setEditingModelId(model.id);
    setExpandedModelId(model.id);
    setEditingName(model.name);
    setEditingClientId(model.clientId);
    setError(null);
    setSuccess(null);
  };

  const cancelEditing = () => {
    setEditingModelId(null);
    setEditingName('');
    setEditingClientId(null);
  };

  const handleUpdateModel = async (modelId: number) => {
    if (!editingClientId) {
      setError('Selecciona un cliente válido para el modelo.');
      return;
    }

    try {
      setSavingModelId(modelId);
      setError(null);
      setSuccess(null);
      await updateModel(modelId, {
        name: editingName,
        clientId: editingClientId,
      });
      cancelEditing();
      setSuccess('Modelo actualizado correctamente.');
      await loadPageData();
    } catch (updateError) {
      setError(getApiErrorMessage(updateError));
    } finally {
      setSavingModelId(null);
    }
  };

  const handleDeleteModel = async (model: ModelRecord) => {
    const confirmed = window.confirm(
      `Se eliminará el modelo "${model.name}" con sus poses y trabajos asociados. Esta acción no se puede deshacer.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingModelId(model.id);
      setError(null);
      setSuccess(null);
      await deleteModel(model.id);

      if (editingModelId === model.id) {
        cancelEditing();
      }

      if (expandedModelId === model.id) {
        setExpandedModelId(null);
      }

      setSuccess('Modelo eliminado correctamente.');
      await loadPageData();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    } finally {
      setDeletingModelId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Modelos"
        description="Crea cada modelo en un solo paso: define el nombre, asígnalo a un cliente y sube las poses antes de guardarlo."
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <CRow className="g-4">
        <CCol xs={12}>
          <CCard className="studio-card">
            <CCardHeader className="border-0 bg-transparent pt-4">
              <h5 className="mb-1">Nuevo modelo</h5>
              <p className="text-body-secondary mb-0">Guarda el modelo ya asociado a una empresa y con sus fotos de pose listas para generar.</p>
            </CCardHeader>
            <CCardBody>
              {loading ? <LoadingBlock /> : null}

              {!loading && clients.length === 0 ? (
                <EmptyState
                  title="Primero necesitas clientes"
                  description="Crea al menos un cliente antes de registrar un modelo."
                />
              ) : null}

              {!loading && clients.length > 0 ? (
                <form onSubmit={handleCreateModel}>
                  <CRow className="g-3 align-items-end">
                    <CCol lg={4}>
                      <CFormLabel htmlFor="model-name">Nombre del modelo</CFormLabel>
                      <CFormInput
                        id="model-name"
                        value={name}
                        placeholder="Ej. Sofía estudio set A"
                        onChange={(event) => setName(event.target.value)}
                      />
                    </CCol>

                    <CCol lg={3}>
                      <CFormLabel htmlFor="model-client">Cliente</CFormLabel>
                      <CFormSelect
                        id="model-client"
                        value={selectedClientId ?? ''}
                        onChange={(event) => setSelectedClientId(event.target.value ? Number(event.target.value) : null)}
                      >
                        <option value="">Selecciona un cliente</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>

                    <CCol lg={3}>
                      <CFormLabel htmlFor="model-images">Fotos del modelo</CFormLabel>
                      <CFormInput id="model-images" type="file" name="images" accept="image/*" multiple />
                      <div className="text-body-secondary small mt-2">Selecciona una o varias poses antes de guardar el modelo.</div>
                    </CCol>

                    <CCol lg={2}>
                      <CButton type="submit" color="dark" disabled={submitting} className="w-100">
                        {submitting ? 'Guardando...' : 'Guardar modelo'}
                      </CButton>
                    </CCol>
                  </CRow>
                </form>
              ) : null}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12}>
          <CCard className="studio-card">
            <CCardHeader className="border-0 bg-transparent pt-4">
              <h5 className="mb-1">Biblioteca de modelos</h5>
              <p className="text-body-secondary mb-0">Cada modelo queda enlazado a su cliente y mantiene sus referencias de pose listas para el wizard.</p>
            </CCardHeader>
            <CCardBody>
              {loading ? <LoadingBlock /> : null}

              {!loading && models.length === 0 ? (
                <EmptyState
                  title="Aún no hay modelos"
                  description="Crea el primer modelo con cliente y poses desde el panel de la izquierda."
                />
              ) : null}

              {!loading && models.length > 0 ? (
                <div className="model-library-list">
                  {models.map((model) => {
                    const expanded = expandedModelId === model.id;
                    const editing = editingModelId === model.id;

                    return (
                      <div key={model.id} className={`model-library-item ${expanded ? 'expanded' : ''}`}>
                        <button
                          type="button"
                          className="model-library-trigger"
                          onClick={() => setExpandedModelId((currentId) => (currentId === model.id ? null : model.id))}
                        >
                          <div className="model-library-main">
                            <strong>{model.name}</strong>
                            <div className="text-body-secondary small">
                              #{model.id} · {model.clientName} · Alta {formatClientDate(model.createdAt)}
                            </div>
                          </div>

                          <div className="model-library-summary">
                            <span>{model.images.length} pose{model.images.length === 1 ? '' : 's'}</span>
                            <span>{expanded ? 'Ocultar' : 'Ver fotos'}</span>
                          </div>
                        </button>

                        {expanded ? (
                          <div className="model-library-body">
                            {editing ? (
                              <CRow className="g-3">
                                <CCol lg={4}>
                                  <CFormLabel>Nombre del modelo</CFormLabel>
                                  <CFormInput
                                    value={editingName}
                                    onChange={(event) => setEditingName(event.target.value)}
                                    placeholder="Nombre del modelo"
                                  />
                                </CCol>

                                <CCol lg={4}>
                                  <CFormLabel>Cliente</CFormLabel>
                                  <CFormSelect
                                    value={editingClientId ?? ''}
                                    onChange={(event) => setEditingClientId(event.target.value ? Number(event.target.value) : null)}
                                  >
                                    <option value="">Selecciona un cliente</option>
                                    {clients.map((client) => (
                                      <option key={client.id} value={client.id}>
                                        {client.name}
                                      </option>
                                    ))}
                                  </CFormSelect>
                                </CCol>

                                <CCol lg={4}>
                                  <div className="d-grid gap-2">
                                    <CButton
                                      color="dark"
                                      onClick={() => void handleUpdateModel(model.id)}
                                      disabled={savingModelId === model.id}
                                    >
                                      {savingModelId === model.id ? 'Guardando...' : 'Guardar cambios'}
                                    </CButton>
                                    <CButton color="secondary" variant="ghost" onClick={cancelEditing} disabled={savingModelId === model.id}>
                                      Cancelar
                                    </CButton>
                                  </div>
                                </CCol>
                              </CRow>
                            ) : (
                              <div className="model-library-actions">
                                <div className="text-body-secondary small">
                                  {model.images.length === 0
                                    ? 'Aún no hay poses cargadas.'
                                    : `${model.images.length} imágenes de pose listas para el wizard.`}
                                </div>

                                <div className="d-flex gap-2 flex-wrap">
                                  <CButton color="secondary" variant="outline" onClick={() => startEditing(model)}>
                                    Editar
                                  </CButton>
                                  <CButton
                                    color="danger"
                                    variant="outline"
                                    onClick={() => void handleDeleteModel(model)}
                                    disabled={deletingModelId === model.id}
                                  >
                                    {deletingModelId === model.id ? 'Eliminando...' : 'Eliminar'}
                                  </CButton>
                                </div>
                              </div>
                            )}

                            {model.images.length > 0 ? (
                              <div className="thumb-grid">
                                {model.images.map((image) => (
                                  <ImageThumb key={image.id} src={image.filePath} alt={`${model.name} pose ${image.id}`} />
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  );
};
