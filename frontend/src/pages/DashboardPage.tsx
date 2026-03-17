import { useEffect, useState } from 'react';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import ViewInArRoundedIcon from '@mui/icons-material/ViewInArRounded';
import CheckroomRoundedIcon from '@mui/icons-material/CheckroomRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '../ui';
import { EmptyState } from '../components/EmptyState';
import { LoadingBlock } from '../components/LoadingBlock';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { fetchClients, fetchJobs, fetchModels, getApiErrorMessage } from '../services/api';
import type { ClientRecord, JobRecord, ModelRecord } from '../types/api';

export const DashboardPage = () => {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [clientsResponse, modelsResponse, jobsResponse] = await Promise.all([
          fetchClients(),
          fetchModels(),
          fetchJobs(),
        ]);

        setClients(clientsResponse);
        setModels(modelsResponse);
        setJobs(jobsResponse);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const processingJobs = jobs.filter((job) => job.status === 'processing').length;
  const completedJobs = jobs.filter((job) => job.status === 'completed').length;
  const garmentsInJobs = new Set(jobs.map((job) => job.garmentFilePath)).size;

  return (
    <>
      <PageHeader
        title="Panel"
        description="Sigue el volumen de generación, la preparación de activos y el estado del proceso de imágenes en segundo plano."
      />

      {loading ? <LoadingBlock /> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}

      {!loading && !error ? (
        <>
          <CRow className="g-4 mb-4">
            <CCol md={6} xl={3}>
              <StatCard label="Clientes" value={clients.length} icon={PeopleRoundedIcon} />
            </CCol>
            <CCol md={6} xl={3}>
              <StatCard label="Modelos" value={models.length} icon={ViewInArRoundedIcon} tone="cool" />
            </CCol>
            <CCol md={6} xl={3}>
              <StatCard label="Prendas en lotes" value={garmentsInJobs} icon={CheckroomRoundedIcon} />
            </CCol>
            <CCol md={6} xl={3}>
              <StatCard label="Trabajos completados" value={completedJobs} icon={TaskAltRoundedIcon} tone="cool" />
            </CCol>
          </CRow>

          <CRow className="g-4">
            <CCol lg={7}>
              <CCard className="studio-card">
                <CCardHeader className="border-0 bg-transparent pt-4">
                  <h5 className="mb-1">Trabajos recientes</h5>
                  <p className="text-body-secondary mb-0">
                    El proceso en segundo plano revisa la cola continuamente y actualiza el estado en SQLite.
                  </p>
                </CCardHeader>
                <CCardBody>
                  {jobs.length === 0 ? (
                    <EmptyState
                      title="Aún no hay trabajos"
                      description="Crea un modelo y luego abre Generar imágenes para subir prendas y encolar combinaciones."
                    />
                  ) : (
                    <CTable align="middle" responsive hover>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>ID</CTableHeaderCell>
                          <CTableHeaderCell>Cliente</CTableHeaderCell>
                          <CTableHeaderCell>Modelo</CTableHeaderCell>
                          <CTableHeaderCell>Prenda</CTableHeaderCell>
                          <CTableHeaderCell>Proveedor</CTableHeaderCell>
                          <CTableHeaderCell>Estado</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {jobs.slice(0, 6).map((job) => (
                          <CTableRow key={job.id}>
                            <CTableDataCell>#{job.id}</CTableDataCell>
                            <CTableDataCell>{job.clientName}</CTableDataCell>
                            <CTableDataCell>{job.modelName}</CTableDataCell>
                            <CTableDataCell>{job.garmentName}</CTableDataCell>
                            <CTableDataCell>{job.provider}</CTableDataCell>
                            <CTableDataCell>
                              <StatusBadge status={job.status} />
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  )}
                </CCardBody>
              </CCard>
            </CCol>

            <CCol lg={5}>
              <CCard className="studio-card">
                <CCardHeader className="border-0 bg-transparent pt-4">
                  <h5 className="mb-1">Flujo operativo</h5>
                  <p className="text-body-secondary mb-0">Un resumen rápido del flujo ideal para el equipo.</p>
                </CCardHeader>
                <CCardBody>
                  <div className="flow-step">
                    <strong>1. Registrar clientes</strong>
                    <span>Define la marca o cuenta a la que quedarán asociadas las imágenes y sus regeneraciones.</span>
                  </div>
                  <div className="flow-step">
                    <strong>2. Crear biblioteca de modelos</strong>
                    <span>Crea un perfil de modelo y sube varias fotos de pose.</span>
                  </div>
                  <div className="flow-step">
                    <strong>3. Subir recortes de producto</strong>
                    <span>Sube las prendas dentro del wizard del lote que quieras producir en ese momento.</span>
                  </div>
                  <div className="flow-step">
                    <strong>4. Encolar combinaciones</strong>
                    <span>Elige cliente, proveedor y crea un trabajo por cada combinación pose-prenda.</span>
                  </div>
                  <div className="flow-step">
                    <strong>5. Evaluar y regenerar</strong>
                    <span>Revisa cada tarjeta, compara versiones y vuelve a generar usando otro prompt o proveedor sin perder el vínculo con el cliente.</span>
                  </div>
                  <div className="flow-step">
                    <strong>En proceso ahora</strong>
                    <span>{processingJobs} trabajos ejecutándose actualmente en el proceso en segundo plano.</span>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>
        </>
      ) : null}
    </>
  );
};
