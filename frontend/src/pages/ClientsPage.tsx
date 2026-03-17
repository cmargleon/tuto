import { FormEvent, useEffect, useState } from 'react';
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CRow,
} from '../ui';
import { EmptyState } from '../components/EmptyState';
import { LoadingBlock } from '../components/LoadingBlock';
import { PageHeader } from '../components/PageHeader';
import { createClient, deleteClient, fetchClients, getApiErrorMessage, updateClient } from '../services/api';
import type { ClientRecord } from '../types/api';

const formatClientDate = (value: string): string =>
  new Date(value).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export const ClientsPage = () => {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingClientId, setSavingClientId] = useState<number | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      setClients(await fetchClients());
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  const startEditing = (client: ClientRecord) => {
    setEditingClientId(client.id);
    setExpandedClientId(client.id);
    setEditingName(client.name);
    setError(null);
    setSuccess(null);
  };

  const cancelEditing = () => {
    setEditingClientId(null);
    setEditingName('');
  };

  const handleCreateClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      await createClient(name);
      setName('');
      setSuccess('Cliente creado. Ya puedes seleccionarlo desde el wizard de generación.');
      await loadClients();
    } catch (submitError) {
      setError(getApiErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateClient = async (clientId: number) => {
    try {
      setSavingClientId(clientId);
      setError(null);
      setSuccess(null);
      await updateClient(clientId, editingName);
      cancelEditing();
      setSuccess('Cliente actualizado correctamente.');
      await loadClients();
    } catch (updateError) {
      setError(getApiErrorMessage(updateError));
    } finally {
      setSavingClientId(null);
    }
  };

  const handleDeleteClient = async (client: ClientRecord) => {
    const confirmed = window.confirm(
      `Se eliminará el cliente "${client.name}" y también sus modelos, poses y trabajos asociados. Esta acción no se puede deshacer.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingClientId(client.id);
      setError(null);
      setSuccess(null);
      await deleteClient(client.id);

      if (editingClientId === client.id) {
        cancelEditing();
      }

      if (expandedClientId === client.id) {
        setExpandedClientId(null);
      }

      setSuccess('Cliente eliminado correctamente.');
      await loadClients();
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    } finally {
      setDeletingClientId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Registra las cuentas o marcas para las que vas a generar contenido y luego enlaza cada lote desde el wizard."
      />

      {error ? <div className="alert alert-danger">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}

      <CRow className="g-4">
        <CCol xl={4}>
          <CCard className="studio-card">
            <CCardHeader className="border-0 bg-transparent pt-4">
              <h5 className="mb-1">Nuevo cliente</h5>
              <p className="text-body-secondary mb-0">Crea la entidad comercial a la que quedarán vinculadas las imágenes generadas.</p>
            </CCardHeader>
            <CCardBody>
              <form onSubmit={handleCreateClient} className="d-grid gap-3">
                <div>
                  <CFormLabel htmlFor="client-name">Nombre del cliente</CFormLabel>
                  <CFormInput
                    id="client-name"
                    value={name}
                    placeholder="Ej. Marca Primavera"
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>

                <CButton type="submit" color="dark" disabled={submitting}>
                  {submitting ? 'Creando...' : 'Crear cliente'}
                </CButton>
              </form>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xl={8}>
          <CCard className="studio-card">
            <CCardHeader className="border-0 bg-transparent pt-4">
              <h5 className="mb-1">Lista de clientes</h5>
              <p className="text-body-secondary mb-0">Mantén aquí tu cartera y edita o elimina cada cuenta con el mismo flujo que usas en modelos.</p>
            </CCardHeader>
            <CCardBody>
              {loading ? <LoadingBlock /> : null}

              {!loading && clients.length === 0 ? (
                <EmptyState
                  title="Aún no hay clientes"
                  description="Crea tu primer cliente para poder asociar los trabajos y sus imágenes generadas."
                />
              ) : null}

              {!loading && clients.length > 0 ? (
                <div className="model-library-list">
                  {clients.map((client) => {
                    const expanded = expandedClientId === client.id;
                    const editing = editingClientId === client.id;

                    return (
                      <div key={client.id} className={`model-library-item ${expanded ? 'expanded' : ''}`}>
                        <button
                          type="button"
                          className="model-library-trigger"
                          onClick={() => setExpandedClientId((currentId) => (currentId === client.id ? null : client.id))}
                        >
                          <div className="model-library-main">
                            <strong>{client.name}</strong>
                            <div className="text-body-secondary small">#{client.id} · Alta {formatClientDate(client.createdAt)}</div>
                          </div>

                          <div className="model-library-summary">
                            <span>Cuenta activa</span>
                            <span>{expanded ? 'Ocultar' : 'Ver detalle'}</span>
                          </div>
                        </button>

                        {expanded ? (
                          <div className="model-library-body">
                            {editing ? (
                              <CRow className="g-3">
                                <CCol lg={8}>
                                  <CFormLabel>Nombre del cliente</CFormLabel>
                                  <CFormInput
                                    value={editingName}
                                    onChange={(event) => setEditingName(event.target.value)}
                                    placeholder="Nombre del cliente"
                                  />
                                </CCol>

                                <CCol lg={4}>
                                  <div className="d-grid gap-2">
                                    <CButton
                                      color="dark"
                                      onClick={() => void handleUpdateClient(client.id)}
                                      disabled={savingClientId === client.id}
                                    >
                                      {savingClientId === client.id ? 'Guardando...' : 'Guardar cambios'}
                                    </CButton>
                                    <CButton color="secondary" variant="ghost" onClick={cancelEditing} disabled={savingClientId === client.id}>
                                      Cancelar
                                    </CButton>
                                  </div>
                                </CCol>
                              </CRow>
                            ) : (
                              <div className="model-library-actions">
                                <div className="text-body-secondary small">
                                  Usa este cliente al crear modelos y lotes; al eliminarlo se borrarán también sus modelos, poses y trabajos asociados.
                                </div>

                                <div className="d-flex gap-2 flex-wrap">
                                  <CButton color="secondary" variant="outline" onClick={() => startEditing(client)}>
                                    Editar
                                  </CButton>
                                  <CButton
                                    color="danger"
                                    variant="outline"
                                    onClick={() => void handleDeleteClient(client)}
                                    disabled={deletingClientId === client.id}
                                  >
                                    {deletingClientId === client.id ? 'Eliminando...' : 'Eliminar'}
                                  </CButton>
                                </div>
                              </div>
                            )}
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
