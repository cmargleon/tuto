import { useEffect, useState } from 'react';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '../ui';
import { LoadingBlock } from '../components/LoadingBlock';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { fetchAnalytics, getApiErrorMessage } from '../services/api';
import type { AnalyticsData } from '../types/api';

const STATUS_COLORS = ['#4caf50', '#f44336'];
const PROVIDER_COLORS = ['#1976d2', '#9c27b0', '#ff9800', '#00bcd4'];

const formatDuration = (seconds: number | null): string => {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const formatUsd = (value: number): string =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const formatUsdShort = (value: number): string =>
  value < 1 ? `$${(value * 100).toFixed(1)}¢` : formatUsd(value);

export const AnalyticsPage = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setData(await fetchAnalytics());
      } catch (loadError) {
        setError(getApiErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const statusPieData = data
    ? [
        { name: 'Completados', value: data.summary.completedJobs },
        { name: 'Fallidos', value: data.summary.failedJobs },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Volumen de generación, costos por proveedor y actividad por cliente."
      />

      {loading ? <LoadingBlock /> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}

      {!loading && !error && data ? (
        <>
          {/* ── Stat cards ─────────────────────────────────────────────────── */}
          <CRow className="g-4 mb-4">
            <CCol md={6} xl={2}>
              <StatCard label="Total trabajos" value={data.summary.totalJobs} icon={ImageRoundedIcon} />
            </CCol>
            <CCol md={6} xl={2}>
              <StatCard
                label="Completados"
                value={data.summary.completedJobs}
                icon={CheckCircleOutlineRoundedIcon}
                tone="cool"
              />
            </CCol>
            <CCol md={6} xl={2}>
              <CCard className="stat-card stat-card-cool">
                <CCardBody>
                  <div className="stat-icon stat-icon-cool">
                    <CheckCircleOutlineRoundedIcon fontSize="medium" />
                  </div>
                  <p className="stat-label mb-2">Tasa de éxito</p>
                  <h2 className="stat-value mb-0">{data.summary.successRate}%</h2>
                </CCardBody>
              </CCard>
            </CCol>
            <CCol md={6} xl={2}>
              <CCard className="stat-card stat-card-accent">
                <CCardBody>
                  <div className="stat-icon stat-icon-accent">
                    <HourglassEmptyRoundedIcon fontSize="medium" />
                  </div>
                  <p className="stat-label mb-2">Duración media</p>
                  <h2 className="stat-value mb-0">{formatDuration(data.summary.avgDurationSeconds)}</h2>
                </CCardBody>
              </CCard>
            </CCol>
            <CCol md={6} xl={2}>
              <CCard className="stat-card stat-card-accent">
                <CCardBody>
                  <div className="stat-icon stat-icon-accent">
                    <AttachMoneyRoundedIcon fontSize="medium" />
                  </div>
                  <p className="stat-label mb-2">Costo total</p>
                  <h2 className="stat-value mb-0">{formatUsd(data.summary.totalCostUsd)}</h2>
                </CCardBody>
              </CCard>
            </CCol>
            <CCol md={6} xl={2}>
              <CCard className="stat-card stat-card-cool">
                <CCardBody>
                  <div className="stat-icon stat-icon-cool">
                    <TrendingUpRoundedIcon fontSize="medium" />
                  </div>
                  <p className="stat-label mb-2">Proyección mensual</p>
                  <h2 className="stat-value mb-0">
                    {data.summary.projectedMonthlyCostUsd != null
                      ? formatUsd(data.summary.projectedMonthlyCostUsd)
                      : '—'}
                  </h2>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          {data.summary.failedJobs > 0 && (
            <CRow className="mb-4">
              <CCol>
                <div className="alert alert-warning d-flex align-items-center gap-2 mb-0">
                  <ErrorOutlineRoundedIcon fontSize="small" />
                  <span>
                    <strong>{data.summary.failedJobs}</strong> trabajos fallidos en total.{' '}
                    {data.summary.pendingJobs > 0 && `${data.summary.pendingJobs} pendientes.`}
                  </span>
                </div>
              </CCol>
            </CRow>
          )}

          {/* ── Volume charts ──────────────────────────────────────────────── */}
          <CRow className="g-4 mb-4">
            <CCol lg={8}>
              <CCard className="studio-card">
                <CCardHeader className="border-0 bg-transparent pt-4">
                  <h5 className="mb-1">Volumen diario (últimos 30 días)</h5>
                  <p className="text-body-secondary mb-0">Trabajos completados y fallidos por día.</p>
                </CCardHeader>
                <CCardBody>
                  {data.dailyVolume.length === 0 ? (
                    <p className="text-body-secondary mb-0">Sin datos de completados aún.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={data.dailyVolume} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4caf50" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f44336" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#f44336" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="completed"
                          name="Completados"
                          stroke="#4caf50"
                          fill="url(#colorCompleted)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="failed"
                          name="Fallidos"
                          stroke="#f44336"
                          fill="url(#colorFailed)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CCardBody>
              </CCard>
            </CCol>

            <CCol lg={4}>
              <CCard className="studio-card">
                <CCardHeader className="border-0 bg-transparent pt-4">
                  <h5 className="mb-1">Distribución de estados</h5>
                  <p className="text-body-secondary mb-0">Completados vs. fallidos.</p>
                </CCardHeader>
                <CCardBody className="d-flex align-items-center justify-content-center">
                  {statusPieData.length === 0 ? (
                    <p className="text-body-secondary mb-0">Sin datos aún.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${Math.round((percent as number) * 100)}%`}
                          labelLine={false}
                        >
                          {statusPieData.map((_entry, index) => (
                            <Cell key={index} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          {/* ── Provider performance ───────────────────────────────────────── */}
          <CRow className="g-4 mb-4">
            <CCol lg={6}>
              <CCard className="studio-card">
                <CCardHeader className="border-0 bg-transparent pt-4">
                  <h5 className="mb-1">Rendimiento por proveedor</h5>
                  <p className="text-body-secondary mb-0">Completados y fallidos por proveedor de IA.</p>
                </CCardHeader>
                <CCardBody>
                  {data.byProvider.length === 0 ? (
                    <p className="text-body-secondary mb-0">Sin datos aún.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={data.byProvider} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis dataKey="provider" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value, name, props) => {
                            const row = props.payload as { avgDurationSeconds: number | null };
                            if (name === 'Completados') {
                              return [`${String(value)} (media: ${formatDuration(row.avgDurationSeconds)})`, name];
                            }
                            return [value, name];
                          }}
                        />
                        <Legend />
                        <Bar dataKey="completed" name="Completados" stackId="a">
                          {data.byProvider.map((_entry, index) => (
                            <Cell key={index} fill={PROVIDER_COLORS[index % PROVIDER_COLORS.length]} />
                          ))}
                        </Bar>
                        <Bar dataKey="failed" name="Fallidos" fill="#f44336" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CCardBody>
              </CCard>
            </CCol>

            <CCol lg={6}>
              <CCard className="studio-card">
                <CCardHeader className="border-0 bg-transparent pt-4">
                  <h5 className="mb-1">Top clientes</h5>
                  <p className="text-body-secondary mb-0">Por volumen de imágenes generadas.</p>
                </CCardHeader>
                <CCardBody>
                  {data.topClients.length === 0 ? (
                    <p className="text-body-secondary mb-0">Sin datos aún.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        layout="vertical"
                        data={data.topClients}
                        margin={{ top: 4, right: 24, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="clientName" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="completed" name="Completados" fill="#1976d2" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          {/* ── Cost section ───────────────────────────────────────────────── */}
          <CRow className="g-4 mb-4">
            <CCol xs={12}>
              <h6 className="text-body-secondary text-uppercase mb-0" style={{ letterSpacing: '0.08em', fontSize: 11 }}>
                Estimación de costos · Precios de referencia: fal-seedream $0.03 · fal-banana-pro $0.15 · openai-gpt-image-1.5 $0.04
              </h6>
            </CCol>
          </CRow>

          <CRow className="g-4 mb-4">
            <CCol lg={8}>
              <CCard className="studio-card">
                <CCardHeader className="border-0 bg-transparent pt-4">
                  <h5 className="mb-1">Gasto diario (últimos 30 días)</h5>
                  <p className="text-body-secondary mb-0">Costo estimado de API por día.</p>
                </CCardHeader>
                <CCardBody>
                  {data.dailyCost.length === 0 ? (
                    <p className="text-body-secondary mb-0">Sin datos de completados aún.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={data.dailyCost} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ff9800" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ff9800" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v: number) => `$${v.toFixed(2)}`} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: unknown) => [`$${(v as number).toFixed(4)}`, 'Costo USD']} />
                        <Area
                          type="monotone"
                          dataKey="costUsd"
                          name="Costo USD"
                          stroke="#ff9800"
                          fill="url(#colorCost)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CCardBody>
              </CCard>
            </CCol>

            <CCol lg={4}>
              <CCard className="studio-card h-100">
                <CCardHeader className="border-0 bg-transparent pt-4">
                  <h5 className="mb-1">Costo por proveedor</h5>
                  <p className="text-body-secondary mb-0">Total acumulado por modelo de IA.</p>
                </CCardHeader>
                <CCardBody>
                  {data.byProvider.filter((p) => p.totalCostUsd > 0).length === 0 ? (
                    <p className="text-body-secondary mb-0">Sin costos aún.</p>
                  ) : (
                    <div className="d-flex flex-column gap-3 pt-1">
                      {data.byProvider
                        .filter((p) => p.completed > 0)
                        .sort((a, b) => b.totalCostUsd - a.totalCostUsd)
                        .map((p, i) => {
                          const maxCost = Math.max(...data.byProvider.map((x) => x.totalCostUsd));
                          const pct = maxCost > 0 ? (p.totalCostUsd / maxCost) * 100 : 0;
                          return (
                            <div key={p.provider}>
                              <div className="d-flex justify-content-between mb-1">
                                <span style={{ fontSize: 12, fontWeight: 500 }}>{p.provider}</span>
                                <span style={{ fontSize: 12 }}>
                                  {formatUsd(p.totalCostUsd)}
                                  <span className="text-body-secondary ms-1" style={{ fontSize: 11 }}>
                                    ({p.completed} imgs × {formatUsdShort(p.costPerImageUsd)})
                                  </span>
                                </span>
                              </div>
                              <div style={{ height: 6, borderRadius: 4, background: 'rgba(0,0,0,0.07)' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    borderRadius: 4,
                                    width: `${pct}%`,
                                    background: PROVIDER_COLORS[i % PROVIDER_COLORS.length],
                                    transition: 'width 0.4s ease',
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          <CRow className="g-4">
            <CCol lg={6}>
              <CCard className="studio-card">
                <CCardHeader className="border-0 bg-transparent pt-4">
                  <h5 className="mb-1">Costo por cliente</h5>
                  <p className="text-body-secondary mb-0">Gasto estimado acumulado por cuenta.</p>
                </CCardHeader>
                <CCardBody>
                  {data.topClients.length === 0 ? (
                    <p className="text-body-secondary mb-0">Sin datos aún.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        layout="vertical"
                        data={[...data.topClients].sort((a, b) => b.totalCostUsd - a.totalCostUsd)}
                        margin={{ top: 4, right: 60, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                        <XAxis
                          type="number"
                          tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis type="category" dataKey="clientName" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: unknown) => [`$${(v as number).toFixed(4)}`, 'Costo USD']} />
                        <Bar dataKey="totalCostUsd" name="Costo USD" fill="#ff9800" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CCardBody>
              </CCard>
            </CCol>

            <CCol lg={6}>
              <CCard className="studio-card">
                <CCardHeader className="border-0 bg-transparent pt-4">
                  <h5 className="mb-1">Precio de referencia por proveedor</h5>
                  <p className="text-body-secondary mb-0">
                    Costo unitario configurado. Actualizable en{' '}
                    <code style={{ fontSize: 11 }}>backend/src/config/providerCosts.ts</code>.
                  </p>
                </CCardHeader>
                <CCardBody>
                  <table className="table table-sm mb-0" style={{ fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th>Proveedor</th>
                        <th className="text-end">$/imagen</th>
                        <th className="text-end">Completados</th>
                        <th className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byProvider.map((p) => (
                        <tr key={p.provider}>
                          <td>{p.provider}</td>
                          <td className="text-end">{formatUsd(p.costPerImageUsd)}</td>
                          <td className="text-end">{p.completed}</td>
                          <td className="text-end">{formatUsd(p.totalCostUsd)}</td>
                        </tr>
                      ))}
                      <tr className="table-active fw-bold">
                        <td colSpan={3}>Total</td>
                        <td className="text-end">{formatUsd(data.summary.totalCostUsd)}</td>
                      </tr>
                    </tbody>
                  </table>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>
        </>
      ) : null}
    </>
  );
};
