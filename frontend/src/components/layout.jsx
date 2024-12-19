import React from 'react';
import Header from './Header';
import Footer from './Footer';

function Layout({ children, isAuthenticated, isAdmin, isOwner }) {
  return (
    <div>
      <Header isAuthenticated={isAuthenticated} isAdmin={isAdmin} isOwner={isOwner} />
      <div className="container mt-4">{children}</div>
      <Footer />
    </div>
  );
}

export default Layout;
