import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ApproveUsers from './pages/approveUsers';
import LoginForm from './pages/loginForm';
import UploadHistoricalData from './pages/UploadHistoricalData';
import AdminDashboard from './pages/adminDashbaord';
import RegisterForm from './pages/registerForm';
import SalesDashboard from './pages/salesDashboard';
import { UserProvider } from './components/userContext';
import Header from './components/header';

const App = () => {
  return (
      <Router>
      <UserProvider>


          <Routes>
            <Route path="/" element={<LoginForm />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/upload_historical" element={<UploadHistoricalData />} />
            <Route path="/approve_users" element={<ApproveUsers />} />
            <Route path="/register" element={<RegisterForm />} />
            <Route path="/sales_dashboard" element={<SalesDashboard />} />
            <Route path="/admin_dashboard" element={<AdminDashboard />} />
          </Routes>
          </UserProvider>

      </Router>
  );
};

export default App;
