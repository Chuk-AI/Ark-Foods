import React, { useContext } from 'react';
import Header from './header';
import Footer from './footer';
import { UserContext } from '../components/userContext';

function Layout({ children }) {
  const { isAuthenticated, userRole } = useContext(UserContext); // Access state from context

  // Determine roles based on userRole
  const isAdmin = userRole === 'admin';
  const isOwner = userRole === 'owner';

  return (
    <div>
      <Header isAuthenticated={isAuthenticated} isAdmin={isAdmin} isOwner={isOwner} />
      <div className="container mt-4">{children}</div>
      <Footer />
    </div>
  );
}

export default Layout;
