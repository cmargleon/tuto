import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material';
import ArchiveRoundedIcon from '@mui/icons-material/ArchiveRounded';
import AutoAwesomeMotionRoundedIcon from '@mui/icons-material/AutoAwesomeMotionRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import Groups2RoundedIcon from '@mui/icons-material/Groups2Rounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import ViewInArRoundedIcon from '@mui/icons-material/ViewInArRounded';

const navigation = [
  { to: '/dashboard', label: 'Panel', icon: DashboardRoundedIcon },
  { to: '/clientes', label: 'Clientes', icon: Groups2RoundedIcon },
  { to: '/models', label: 'Modelos', icon: ViewInArRoundedIcon },
  { to: '/generate', label: 'Generar imágenes', icon: AutoAwesomeMotionRoundedIcon },
  { to: '/evaluacion', label: 'Evaluación', icon: FactCheckRoundedIcon },
  { to: '/archivo', label: 'Archivo', icon: ArchiveRoundedIcon },
  { to: '/analytics', label: 'Analytics', icon: BarChartRoundedIcon },
];

const sidebarWidth = 280;

export const AppLayout = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false);

  return (
    <Box className="app-shell">
      <Drawer
        variant="permanent"
        className="material-sidebar desktop-sidebar"
        sx={{
          display: { xs: 'none', lg: 'block' },
          '& .MuiDrawer-paper': {
            width: sidebarWidth,
            boxSizing: 'border-box',
            border: 'none',
          },
        }}
        open
      >
        <Box className="studio-sidebar-brand">
          <p className="eyebrow mb-1">Material Studio</p>
          <strong>Prueba Virtual</strong>
        </Box>
        <Box className="material-nav-list">
          {navigation.map((item) => (
            <Box key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `nav-link studio-nav-link ${isActive ? 'active' : ''}`}
              >
                <item.icon className="nav-link-icon" />
                {item.label}
              </NavLink>
            </Box>
          ))}
        </Box>
      </Drawer>

      <Drawer
        variant="temporary"
        open={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': {
            width: sidebarWidth,
            boxSizing: 'border-box',
            border: 'none',
          },
        }}
      >
        <Box className="studio-sidebar-brand">
          <p className="eyebrow mb-1">Material Studio</p>
          <strong>Prueba Virtual</strong>
        </Box>
        <Box className="material-nav-list">
          {navigation.map((item) => (
            <Box key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `nav-link studio-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarVisible(false)}
              >
                <item.icon className="nav-link-icon" />
                {item.label}
              </NavLink>
            </Box>
          ))}
        </Box>
      </Drawer>

      <Box className="studio-main">
        <AppBar position="sticky" color="inherit" elevation={0} className="studio-header">
          <Toolbar className="material-toolbar">
            <Box className="d-flex align-items-center gap-3">
              <IconButton
                className="material-menu-button"
                onClick={() => setSidebarVisible(true)}
                sx={{ display: { lg: 'none' } }}
              >
                <MenuRoundedIcon />
              </IconButton>

              <Box>
                <p className="eyebrow mb-1">Material Dashboard React</p>
                <Typography variant="h6" className="mb-0">
                  Estudio de prueba virtual
                </Typography>
              </Box>
            </Box>

            <div className="header-chip">SQLite + proceso IA</div>
          </Toolbar>
        </AppBar>

        <div className="body flex-grow-1 px-3 px-lg-4 pb-4">
          <Outlet />
        </div>
      </Box>
    </Box>
  );
};
