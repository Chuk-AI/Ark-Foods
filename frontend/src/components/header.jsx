
// export default Header;
import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../components/userContext";
import { UserRole } from "../components/roles";
import '../styles/styles.css'
import logo from '../styles/logo.png'

function Header() {
  const { isAuthenticated, userRole, logout } = useContext(UserContext); // Access context
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const navigate = useNavigate();

  // Toggle Navbar Collapse
  const handleNavCollapse = () => setIsNavCollapsed(!isNavCollapsed);

  // Handle Logout
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      logout(); // Clear authentication state
      navigate("/login"); // Redirect to login
    }
  };

  // Helper function to check for allowed roles
  const hasAccess = (allowedRoles) => allowedRoles.includes(userRole);

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container">
        {/* Brand Logo */}
        <Link className="navbar-brand" to="/">
    
          <img src={logo} alt="Logo" 
            width="40"
            height="40"
            className="logo"
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
                {/* Admin Dashboard (ADMIN and OWNER roles) */}
                {hasAccess([UserRole.ADMIN, UserRole.OWNER]) && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/admin_dashboard">
                      Admin Dashboard
                    </Link>
                  </li>
                )}

                {/* Sales Dashboard (SALES and OWNER roles) */}
                {hasAccess([UserRole.SALES, UserRole.OWNER, UserRole.ADMIN]) && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/sales_dashboard">
                      Sales Dashboard
                    </Link>
                  </li>
                )}
                    {hasAccess([ UserRole.OWNER, UserRole.ADMIN]) && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/weather_dashboard">
                      Weather Dashboard
                    </Link>
                  </li>
                )}

                {/* Logout */}
                <li className="nav-item">
                  <button
                    className="nav-link btn btn-link"
                    onClick={handleLogout}
                    style={{ padding: 0 }}
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                {/* Login */}
                <li className="nav-item">
                  <Link className="nav-link" to="/login">
                    Login
                  </Link>
                </li>

                {/* Register */}
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
