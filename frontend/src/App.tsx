import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { ArchivePage } from './pages/ArchivePage';
import { ClientsPage } from './pages/ClientsPage';
import { DashboardPage } from './pages/DashboardPage';
import { GenerateWizardPage } from './pages/GenerateWizardPage';
import { JobsPage } from './pages/JobsPage';
import { ModelsPage } from './pages/ModelsPage';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="clientes" element={<ClientsPage />} />
        <Route path="models" element={<ModelsPage />} />
        <Route path="generate" element={<GenerateWizardPage />} />
        <Route path="evaluacion" element={<JobsPage />} />
        <Route path="archivo" element={<ArchivePage />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export default App;
