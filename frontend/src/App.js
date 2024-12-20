// import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
// import ApproveUsers from './pages/approveUsers';
// import LoginForm from './pages/loginForm';
// import UploadHistoricalData from './pages/UploadHistoricalData';
// import AdminDashboard from './pages/adminDashbaord';
// import RegisterForm from './pages/registerForm';
// import SalesDashboard from './pages/salesDashboard';
// import { UserProvider } from './components/userContext';
// import React, { useEffect, useContext } from "react";
// import axios from "axios";
// import { UserContext } from "./components/userContext";
// import Header from './components/header';


// axios.defaults.withCredentials = true;
// axios.defaults.baseURL = "http://127.0.0.1:5500";

// const App = () => {

//   return (
//       <Router>
//       <UserProvider>


//           <Routes>
//             <Route path="/" element={<LoginForm />} />
//             <Route path="/login" element={<LoginForm />} />
//             <Route path="/upload_historical" element={<UploadHistoricalData />} />
//             <Route path="/approve_users" element={<ApproveUsers />} />
//             <Route path="/register" element={<RegisterForm />} />
//             <Route path="/sales_dashboard" element={<SalesDashboard />} />
//             <Route path="/admin_dashboard" element={<AdminDashboard />} />
//           </Routes>
//           </UserProvider>

//       </Router>
//   );
// };

// export default App;


import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import ApproveUsers from './pages/approveUsers';
import LoginForm from './pages/loginForm';
import UploadHistoricalData from './pages/UploadHistoricalData';
import AdminDashboard from './pages/adminDashbaord';
import RegisterForm from './pages/registerForm';
import SalesDashboard from './pages/salesDashboard';
import { UserProvider, UserContext } from './components/userContext';
import React, { useContext } from "react";
import axios from "axios";
import Header from './components/header';
import ProtectedRoute from './components/protectedRoute'

// Axios Defaults
axios.defaults.baseURL = "http://127.0.0.1:5500";
axios.defaults.withCredentials = true;

// Add Authorization header for all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
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
          <Route path="/sales_dashboard" element={<ProtectedRoute roles={["sales", "owner"]}><SalesDashboard /></ProtectedRoute>} />
          <Route path="/admin_dashboard" element={<ProtectedRoute role="owner"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/upload_historical" element={<ProtectedRoute role="owner"><UploadHistoricalData /></ProtectedRoute>} />
          <Route path="/approve_users" element={<ProtectedRoute role="owner"><ApproveUsers /></ProtectedRoute>} />
        </Routes>
      </UserProvider>
    </Router>
  );
};

export default App;
