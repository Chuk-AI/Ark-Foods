import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../components/userContext";
import { UserRole } from "../components/roles"; // Import the enum

function Header() {
  const { isAuthenticated, userRole, logout } = useContext(UserContext); // Access logout function
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const navigate = useNavigate();

  // Toggle the Navbar Collapse
  const handleNavCollapse = () => setIsNavCollapsed(!isNavCollapsed);

  // Handle logout click
  const handleLogout = () => {
    logout(); // Clear authentication state
    navigate("/login"); // Redirect to login
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container">
        {/* Brand Logo */}
        <Link className="navbar-brand" to="/">
          <img
            src="/static/images/logo.png"
            alt="App Logo"
            width="40"
            height="40"
          />
        </Link>

        {/* Navbar Toggler */}
        <button
          className="navbar-toggler"
          type="button"
          aria-controls="navbarNav"
          aria-expanded={!isNavCollapsed}
          aria-label="Toggle navigation"
          onClick={handleNavCollapse}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Collapsible Navbar */}
        <div
          className={`collapse navbar-collapse ${isNavCollapsed ? "" : "show"}`}
          id="navbarNav"
        >
          <ul className="navbar-nav ml-auto">
            {isAuthenticated ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/admin_dashboard">
                    Admin Dashboard
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/owner_dashboard">
                    Owner Dashboard
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/sales_dashboard">
                    Sales Dashboard
                  </Link>
                </li>
                <li className="nav-item">
                  <button className="nav-link btn btn-link" onClick={handleLogout} style={{ padding: 0 }}>
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/login">
                    Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/register">
                    Register
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Header;
