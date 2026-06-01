import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import ApproveUsers from './pages/approveUsers';
import LoginForm from './pages/loginForm';
import UploadHistoricalData from './pages/UploadHistoricalData';
import AdminDashboard from './pages/adminDashboard';
import RegisterForm from './pages/registerForm';
import SalesDashboard from './pages/salesDashboard';
import { UserProvider } from './components/userContext';
import React from 'react';
import axios from 'axios';
import ProtectedRoute from './components/protectedRoute';
import DashAnalytics from './pages/analytics';
import DynamicAnalytics from './pages/dynamicAnalytics';
import Alerts from './pages/Alerts';
import NewDashboard from './pages/NewDashboard';
import PricingDashboard from './pages/PricingDashboard';
import WeatherDashboard from './pages/WeatherDashboard';
import Layout from './components/layout';

axios.defaults.baseURL = 'https://arkfoods.klicksai.com';

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const App = () => {
  return (
    <Router>
      <UserProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<LoginForm />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />

            <Route path="/sales_dashboard" element={
              <ProtectedRoute roles={['sales', 'owner', 'admin']}>
                <SalesDashboard />
              </ProtectedRoute>
            }/>
            <Route path="/admin_dashboard" element={
              <ProtectedRoute roles={['admin', 'owner']}>
                <AdminDashboard />
              </ProtectedRoute>
            }/>
            <Route path="/upload_historical" element={
              <ProtectedRoute roles={['owner', 'sales']}>
                <UploadHistoricalData />
              </ProtectedRoute>
            }/>
            <Route path="/approve_users" element={
              <ProtectedRoute roles={['admin', 'owner']}>
                <ApproveUsers />
              </ProtectedRoute>
            }/>
            <Route path="/analytics" element={
              <ProtectedRoute roles={['admin', 'owner']}>
                <DashAnalytics />
              </ProtectedRoute>
            }/>
            <Route path="/dynamic_analytics" element={
              <ProtectedRoute roles={['admin', 'owner']}>
                <DynamicAnalytics />
              </ProtectedRoute>
            }/>
            <Route path="/alerts" element={
              <ProtectedRoute roles={['admin', 'owner']}>
                <Alerts />
              </ProtectedRoute>
            }/>
            <Route path="/new_dashboard" element={
              <ProtectedRoute roles={['sales', 'owner', 'admin']}>
                <NewDashboard />
              </ProtectedRoute>
            }/>
            <Route path="/pricing" element={
              <ProtectedRoute roles={['sales', 'owner', 'admin']}>
                <PricingDashboard />
              </ProtectedRoute>
            }/>
            <Route path="/weather" element={
              <ProtectedRoute roles={['sales', 'owner', 'admin']}>
                <WeatherDashboard />
              </ProtectedRoute>
            }/>
          </Routes>
        </Layout>
      </UserProvider>
    </Router>
  );
};

export default App;
