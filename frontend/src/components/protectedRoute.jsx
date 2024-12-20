import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { UserContext } from "../components/userContext";

const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, userRole, initialized } = useContext(UserContext);


if (!initialized) {
    return null; // or a loading spinner
  }

  if (!isAuthenticated) {
    // Redirect unauthenticated users to login
    return <Navigate to="/login" replace />;
  }

  if (role && userRole !== role) {
    // Redirect unauthorized users to home or "access denied" page
    return <Navigate to="/" replace />;
  }

  return children; // Render the protected component
};

export default ProtectedRoute;
