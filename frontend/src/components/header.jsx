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
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      updateNotificationCount().then((count) => setUnreadCount(count));
      const intervalId = startNotificationPolling(60000);
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated]);

  const handleNavCollapse = () => setIsNavCollapsed(!isNavCollapsed);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      logout();
      navigate("/login");
    }
  };

  const hasAccess = (allowedRoles) => allowedRoles.includes(userRole);
  const isActive = (path) => (location.pathname === path ? "active-tab" : "");

  return (
    <nav className="navbar">
      {/* Logo */}
      <Link className="navbar-brand" to="/">
        <img src={logo} alt="Ark Foods Logo" width="40" height="40" />
      </Link>

      {/* Hamburger for mobile */}
      <button
        className="navbar-toggler"
        type="button"
        aria-controls="navbarNav"
        aria-expanded={!isNavCollapsed}
        aria-label="Toggle navigation"
        onClick={handleNavCollapse}
        style={{
          display: "none",
          background: "none",
          border: "1px solid var(--color-border)",
          borderRadius: "6px",
          padding: "6px 10px",
          cursor: "pointer",
          marginLeft: "auto",
        }}
      >
        <span style={{ display: "block", width: 20, height: 2, background: "var(--color-text-muted)", marginBottom: 4 }}></span>
        <span style={{ display: "block", width: 20, height: 2, background: "var(--color-text-muted)", marginBottom: 4 }}></span>
        <span style={{ display: "block", width: 20, height: 2, background: "var(--color-text-muted)" }}></span>
      </button>

      {/* Nav links */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flex: 1,
          justifyContent: "flex-end",
        }}
        id="navbarNav"
        className={isNavCollapsed ? "" : "nav-open"}
      >
        <ul className="navbar-nav">
          {isAuthenticated ? (
            <>
              {hasAccess([UserRole.ADMIN, UserRole.OWNER]) && (
                <li className={`nav-item ${isActive("/admin_dashboard")}`}>
                  <Link className="nav-link" to="/admin_dashboard">
                    Admin Dashboard
                  </Link>
                </li>
              )}

              {hasAccess([UserRole.SALES, UserRole.OWNER, UserRole.ADMIN]) && (
                <li className={`nav-item ${isActive("/sales_dashboard")}`}>
                  <Link className="nav-link" to="/sales_dashboard">
                    Sales Dashboard
                  </Link>
                </li>
              )}

              {hasAccess([UserRole.OWNER, UserRole.ADMIN, UserRole.SALES]) && (
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

              {hasAccess([UserRole.OWNER, UserRole.ADMIN, UserRole.SALES]) && (
                <li className={`nav-item ${isActive("/analytics")}`}>
                  <Link className="nav-link" to="/analytics">
                    Analytics
                  </Link>
                </li>
              )}

              {hasAccess([UserRole.OWNER, UserRole.ADMIN, UserRole.SALES]) && (
                <li className={`nav-item ${isActive("/dynamic_analytics")}`}>
                  <Link className="nav-link" to="/dynamic_analytics">
                    Dynamic Analytics
                  </Link>
                </li>
              )}

              {hasAccess([UserRole.OWNER, UserRole.ADMIN, UserRole.SALES]) && (
                <li className={`nav-item ${isActive("/alerts")}`}>
                  <Link className="nav-link" to="/alerts" style={{ position: "relative" }}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="notification-badge ms-1">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              )}

              <li className="nav-item" style={{ marginLeft: "8px" }}>
                <button
                  onClick={handleLogout}
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--color-text-muted)",
                    background: "none",
                    border: "1px solid var(--color-border)",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    cursor: "pointer",
                    transition: "color 0.15s ease, border-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--color-danger)";
                    e.currentTarget.style.borderColor = "var(--color-danger)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--color-text-muted)";
                    e.currentTarget.style.borderColor = "var(--color-border)";
                  }}
                >
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li className={`nav-item ${isActive("/login")}`}>
                <Link className="nav-link" to="/login">
                  Login
                </Link>
              </li>
              <li className={`nav-item ${isActive("/register")}`}>
                <Link className="nav-link" to="/register">
                  Register
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>

      {/* Mobile styles via inline style tag equivalent */}
      <style>{`
        @media (max-width: 768px) {
          .navbar { padding: 0 16px; }
          .navbar-toggler { display: block !important; }
          #navbarNav {
            position: absolute;
            top: 64px;
            left: 0;
            right: 0;
            background: var(--color-surface);
            border-bottom: 1px solid var(--color-border);
            padding: 12px 16px;
            display: none !important;
            flex-direction: column;
            align-items: flex-start;
            box-shadow: var(--shadow-md);
          }
          #navbarNav.nav-open {
            display: flex !important;
          }
          .navbar-nav {
            flex-direction: column;
            width: 100%;
            gap: 2px;
          }
          .nav-item { width: 100%; }
          .nav-link { width: 100%; }
        }
      `}</style>
    </nav>
  );
}

export default Header;
