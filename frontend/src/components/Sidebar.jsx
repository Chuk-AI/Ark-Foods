import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserContext } from './userContext';
import { UserRole } from './roles';
import '../styles/styles.css';

// SVG icon set matching the design
const Icon = {
  Dashboard: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  Chart: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
  Zap: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Cloud: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>,
  Leaf: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
  Truck: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  Bell: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  Users: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Upload: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Settings: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Logout: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Forecast: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 12h2"/><path d="M20 12h2"/><path d="M12 2v2"/><path d="M12 20v2"/><circle cx="12" cy="12" r="4"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M17.66 6.34l1.41-1.41"/><path d="M4.93 19.07l1.41-1.41"/></svg>,
};

function Sidebar({ unreadAlerts = 0 }) {
  const { isAuthenticated, userRole, logout } = useContext(UserContext);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigate('/login');
    }
  };

  const has = (roles) => roles.includes(userRole);

  const initials = (userRole || 'U').slice(0, 2).toUpperCase();

  return (
    <aside className="sb">
      <div className="sb-brand">
        <div className="sb-logo">AF</div>
        <div>
          <div className="sb-brand-name">Ark Foods</div>
          <div className="sb-brand-sub">Markets workspace</div>
        </div>
      </div>

      <nav className="sb-nav">
        <div className="sb-group-label">Workspace</div>

        {has([UserRole.SALES, UserRole.OWNER, UserRole.ADMIN]) && (
          <Link to="/sales_dashboard" className={`sb-item ${isActive('/sales_dashboard') ? 'active' : ''}`}>
            <Icon.Dashboard />
            <span>Sales Dashboard</span>
          </Link>
        )}

        {has([UserRole.SALES, UserRole.OWNER, UserRole.ADMIN]) && (
          <Link to="/new_dashboard" className={`sb-item ${isActive('/new_dashboard') ? 'active' : ''}`}>
            <Icon.Forecast />
            <span>Forecasts</span>
          </Link>
        )}

        {has([UserRole.SALES, UserRole.OWNER, UserRole.ADMIN]) && (
          <Link to="/pricing" className={`sb-item ${isActive('/pricing') ? 'active' : ''}`}>
            <Icon.Chart />
            <span>Pricing</span>
          </Link>
        )}

        {has([UserRole.SALES, UserRole.OWNER, UserRole.ADMIN]) && (
          <Link to="/weather" className={`sb-item ${isActive('/weather') ? 'active' : ''}`}>
            <Icon.Cloud />
            <span>Weather</span>
          </Link>
        )}

        {has([UserRole.ADMIN, UserRole.OWNER]) && (
          <Link to="/admin_dashboard" className={`sb-item ${isActive('/admin_dashboard') ? 'active' : ''}`}>
            <Icon.Settings />
            <span>Admin Dashboard</span>
          </Link>
        )}

        <div className="sb-group-label">Analytics</div>

        {has([UserRole.ADMIN, UserRole.OWNER, UserRole.SALES]) && (
          <Link to="/analytics" className={`sb-item ${isActive('/analytics') ? 'active' : ''}`}>
            <Icon.Chart />
            <span>Price Analytics</span>
          </Link>
        )}

        {has([UserRole.ADMIN, UserRole.OWNER, UserRole.SALES]) && (
          <Link to="/dynamic_analytics" className={`sb-item ${isActive('/dynamic_analytics') ? 'active' : ''}`}>
            <Icon.Zap />
            <span>Dynamic Analytics</span>
          </Link>
        )}

        <div className="sb-group-label">Operations</div>

        {has([UserRole.ADMIN, UserRole.OWNER, UserRole.SALES]) && (
          <Link to="/alerts" className={`sb-item ${isActive('/alerts') ? 'active' : ''}`}>
            <Icon.Bell />
            <span>Alerts</span>
            {unreadAlerts > 0 && <span className="sb-badge">{unreadAlerts}</span>}
          </Link>
        )}

        <div className="sb-group-label">Admin</div>

        {has([UserRole.ADMIN, UserRole.OWNER]) && (
          <Link to="/approve_users" className={`sb-item ${isActive('/approve_users') ? 'active' : ''}`}>
            <Icon.Users />
            <span>Approve Users</span>
          </Link>
        )}

        {has([UserRole.OWNER, UserRole.SALES]) && (
          <Link to="/upload_historical" className={`sb-item ${isActive('/upload_historical') ? 'active' : ''}`}>
            <Icon.Upload />
            <span>Upload Data</span>
          </Link>
        )}
      </nav>

      <div className="sb-foot">
        <div className="sb-avatar">{initials}</div>
        <div style={{ minWidth: 0 }}>
          <div className="sb-user-name">{userRole || 'User'}</div>
          <div className="sb-user-role">{userRole}</div>
        </div>
        <button className="sb-foot-btn" title="Logout" onClick={handleLogout}>
          <Icon.Logout />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
