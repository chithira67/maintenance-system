import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import TasksPage from './pages/TasksPage';
import MaintenanceCalendar from './pages/MaintenanceCalendar';
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import MasterDataPage from './pages/MasterDataPage';
import ImageImportPage from './pages/ImageImportPage';
import Layout from './components/common/Layout';

const corporateTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1e3a5f' },
    secondary: { main: '#2d6a4f' },
    background: { default: '#f4f6f9', paper: '#ffffff' },
    text: { primary: '#1a202c', secondary: '#4a5568' },
  },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function PermissionRoute({ permission, children }) {
  const { user, loading, can } = useAuth();
  if (loading) return <div className="loader">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!can(permission)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AnyPermissionRoute({ permissions, children }) {
  const { user, loading, canAny } = useAuth();
  if (loading) return <div className="loader">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!canAny(permissions)) return <Navigate to="/dashboard" replace />;
  return children;
}

function DashboardHome() {
  const { can, loading } = useAuth();
  if (loading) return <div className="loader">Loading...</div>;
  if (can('dashboard:team')) return <AdminDashboard />;
  return <UserDashboard />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardHome />} />
        <Route path="calendar" element={<MaintenanceCalendar />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route
          path="import-image"
          element={
            <PermissionRoute permission="tasks:create">
              <ImageImportPage />
            </PermissionRoute>
          }
        />
        <Route
          path="master-data"
          element={
            <PermissionRoute permission="masters:manage">
              <MasterDataPage />
            </PermissionRoute>
          }
        />
        <Route
          path="users"
          element={
            <PermissionRoute permission="users:manage">
              <UsersPage />
            </PermissionRoute>
          }
        />
        <Route
          path="roles"
          element={
            <AnyPermissionRoute permissions={['roles:view', 'roles:manage', 'users:manage', '*']}>
              <RolesPage />
            </AnyPermissionRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={corporateTheme}>
        <CssBaseline />
        <AuthProvider>
          <AppRoutes />
          <ToastContainer position="top-right" autoClose={3000} />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
