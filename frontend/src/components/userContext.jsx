import React, { createContext, useState, useEffect } from 'react';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Check the JWT token and user role on initial load

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setIsAuthenticated(true);
          setUserRole(payload.role);
        } else {
          logout();
        }
      } catch (error) {
        console.error('Error decoding token:', error);
        logout();
      }
    }
    setInitialized(true); // Mark initialization as complete
  }, []);

  const login = (token) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid token format');
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.role) throw new Error('Missing role in token payload');

      setIsAuthenticated(true);
      setUserRole(payload.role); // Use `role` from additional claims
      localStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Error decoding token:', error);
      logout();
    }
  };

  // Logout function to clear auth state and storage
  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    localStorage.removeItem('authToken'); // Clear the token
  };

  return <UserContext.Provider value={{ isAuthenticated, userRole, login, logout, initialized }}>{children}</UserContext.Provider>;
};
