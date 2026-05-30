import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { UserContext } from "../components/userContext";
import { UserRole } from "../components/roles";
import {
  updateNotificationCount,
  startNotificationPolling,
} from "../utils/updateNotificationCount";
import "../styles/styles.css";
import logo from "../styles/logo.png";

function Header() {
  const { isAuthenticated, userRole, logout } = useContext(UserContext);
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation(); // Get current location

  // Fetch unread notification count on component mount
  useEffect(() => {
    if (isAuthenticated) {
      // Initial fetch
      updateNotificationCount().then((count) => setUnreadCount(count));

      // Start polling for new notifications (every minute)
      const intervalId = startNotificationPolling(60000);

      // Clean up on unmount
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated]);

  // Toggle Navbar Collapse
  const handleNavCollapse = () => setIsNavCollapsed(!isNavCollapsed);

  // Handle Logout
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      logout();
      navigate("/login");
    }
  };

  // Helper function to check for allowed roles
  const hasAccess = (allowedRoles) => allowedRoles.includes(userRole);

  // Function to check if a tab is active
  const isActive = (path) => (location.pathname === path ? "active-tab" : "");

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <div className="container">
        {/* Brand Logo */}
        <Link className="navbar-brand" to="/">
          <img src={logo} alt="Logo" width="40" height="40" className="logo" />
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
                {/* Admin Dashboard */}
                {hasAccess([UserRole.ADMIN, UserRole.OWNER]) && (
                  <li className={`nav-item ${isActive("/admin_dashboard")}`}>
                    <Link className="nav-link" to="/admin_dashboard">
                      Admin Dashboard
                    </Link>
                  </li>
                )}

                {/* Sales Dashboard */}
                {hasAccess([
                  UserRole.SALES,
                  UserRole.OWNER,
                  UserRole.ADMIN,
                ]) && (
                  <li className={`nav-item ${isActive("/sales_dashboard")}`}>
                    <Link className="nav-link" to="/sales_dashboard">
                      Sales Dashboard
                    </Link>
                  </li>
                )}
                {/* New Dashboard (external) */}
                {hasAccess([
                  UserRole.OWNER,
                  UserRole.ADMIN,
                  UserRole.SALES,
                ]) && (
                  <li className="nav-item">
                    <a
                      className="nav-link"
                      href="https://arkfoods2.klicksai.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      New Dashboard
                    </a>
                  </li>
                )}

                {/* Analytics */}
                {hasAccess([
                  UserRole.OWNER,
                  UserRole.ADMIN,
                  UserRole.SALES,
                ]) && (
                  <li className={`nav-item ${isActive("/analytics")}`}>
                    <Link className="nav-link" to="/analytics">
                      Analytics
                    </Link>
                  </li>
                )}

                {/* Dynamic Analytics */}
                {hasAccess([
                  UserRole.OWNER,
                  UserRole.ADMIN,
                  UserRole.SALES,
                ]) && (
                  <li className={`nav-item ${isActive("/dynamic_analytics")}`}>
                    <Link className="nav-link" to="/dynamic_analytics">
                      Dynamic Analytics
                    </Link>
                  </li>
                )}

                {/* Alerts/Notifications */}
                {hasAccess([
                  UserRole.OWNER,
                  UserRole.ADMIN,
                  UserRole.SALES,
                ]) && (
                  <li className={`nav-item ${isActive("/alerts")}`}>
                    <Link
                      className="nav-link d-flex align-items-center"
                      to="/alerts"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        className="bi bi-bell"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6" />
                      </svg>
                      {unreadCount > 0 && (
                        <span className="badge bg-danger rounded-pill ms-1 notification-badge">
                          {unreadCount}
                        </span>
                      )}
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
                <li className={`nav-item ${isActive("/login")}`}>
                  <Link className="nav-link" to="/login">
                    Login
                  </Link>
                </li>

                {/* Register */}
                <li className={`nav-item ${isActive("/register")}`}>
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
