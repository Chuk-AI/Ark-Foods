import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import ApproveUsers from './pages/approveUsers';
import LoginForm from './pages/loginForm';
import UploadHistoricalData from './pages/UploadHistoricalData';
import AdminDashboard from './pages/adminDashboard';
import RegisterForm from './pages/registerForm';
import SalesDashboard from './pages/salesDashboard';
import { UserProvider, UserContext } from './components/userContext';
import React, { useContext } from 'react';
import axios from 'axios';
import ProtectedRoute from './components/protectedRoute';
import WeatherPage from './pages/WeatherPage';
import DashAnalytics from './pages/analytics';
import DynamicAnalytics from './pages/dynamicAnalytics';
import Alerts from './pages/Alerts';
// Axios Defaults

axios.defaults.baseURL = 'http://localhost:5500/'; // local backend
// axios.defaults.baseURL = 'https://arkfoods.klicksai.com'; // or your custom domain

// Add Authorization header for all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const App = () => {
  return (
    <Router>
      <UserProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LoginForm />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />

          {/* Protected Routes */}
          <Route
            path="/sales_dashboard"
            element={
              <ProtectedRoute roles={['sales', 'owner', 'admin']}>
                <SalesDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin_dashboard"
            element={
              <ProtectedRoute roles={['admin', 'owner']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload_historical"
            element={
              <ProtectedRoute roles={['owner', 'sales']}>
                <UploadHistoricalData />
              </ProtectedRoute>
            }
          />
          <Route
            path="/approve_users"
            element={
              <ProtectedRoute roles={['admin', 'owner']}>
                <ApproveUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/weather_dashboard"
            element={
              <ProtectedRoute roles={['admin', 'owner']}>
                <WeatherPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute roles={['admin', 'owner']}>
                <DashAnalytics />
              </ProtectedRoute>
            }
          />
           <Route
            path="/dynamic_analytics"
            element={
              <ProtectedRoute roles={['admin', 'owner']}>
                <DynamicAnalytics />
              </ProtectedRoute>
            }
          />
           <Route
            path="/alerts"
            element={
              <ProtectedRoute roles={['admin', 'owner']}>
                <Alerts />
              </ProtectedRoute>
            }
          />
        </Routes>
      </UserProvider>
    </Router>
  );
};

export default App;
