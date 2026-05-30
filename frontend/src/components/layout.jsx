import React, { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { UserContext } from './userContext';
import '../styles/styles.css';

// Topbar search + icon buttons
const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
  </svg>
);
const BellIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
  </svg>
);
const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l1.8 5.8L20 10l-6.2 2.2L12 18l-1.8-5.8L4 10l6.2-2.2z"/>
  </svg>
);
const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);

function Topbar({ title, tweaksOpen, setTweaksOpen }) {
  return (
    <header className="topbar">
      <div className="topbar-crumb">
        <span>Ark Foods</span>
        <span className="sep">/</span>
        <span className="topbar-title">{title}</span>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className="search">
          <SearchIcon />
          <span>Search…</span>
          <kbd>⌘K</kbd>
        </div>
        <button className="icon-btn" title="Notifications">
          <BellIcon />
        </button>
        <button className="icon-btn" title="Tweaks" onClick={() => setTweaksOpen(o => !o)}>
          <SparkleIcon />
        </button>
      </div>
    </header>
  );
}

function TweaksPanel({ tweaks, setTweak, open, setOpen }) {
  return (
    <div className={`tweaks ${open ? 'open' : ''}`}>
      <div className="tweaks-head">
        <span className="dot" />
        <span>Tweaks</span>
        <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={() => setOpen(false)}>
          <XIcon />
        </button>
      </div>
      <div className="tweaks-body">
        <div className="tw-row">
          <div className="tw-label">Theme</div>
          <div className="tw-opts">
            {['light', 'dark'].map(v => (
              <div key={v} className={`tw-opt ${tweaks.theme === v ? 'active' : ''}`} onClick={() => setTweak('theme', v)}>{v}</div>
            ))}
          </div>
        </div>
        <div className="tw-row">
          <div className="tw-label">Density</div>
          <div className="tw-opts">
            {['comfortable', 'compact'].map(v => (
              <div key={v} className={`tw-opt ${tweaks.density === v ? 'active' : ''}`} onClick={() => setTweak('density', v)}>{v}</div>
            ))}
          </div>
        </div>
        <div className="tw-row">
          <div className="tw-label">Accent</div>
          <div className="tw-swatches">
            {[
              ['teal', 'oklch(0.62 0.12 190)'],
              ['indigo', 'oklch(0.62 0.12 260)'],
              ['emerald', 'oklch(0.62 0.12 150)'],
              ['amber', 'oklch(0.62 0.12 60)'],
              ['rose', 'oklch(0.62 0.12 10)'],
            ].map(([k, v]) => (
              <div key={k}
                className={`tw-swatch ${tweaks.accent === k ? 'active' : ''}`}
                style={{ background: v }}
                onClick={() => setTweak('accent', k)}
                title={k}
              />
            ))}
          </div>
        </div>
        <div className="tw-row">
          <div className="tw-label">Sidebar</div>
          <div className="tw-opts">
            {[['sidebar', 'expanded'], ['collapsed', 'collapsed']].map(([k, label]) => (
              <div key={k} className={`tw-opt ${tweaks.nav === k ? 'active' : ''}`} onClick={() => setTweak('nav', k)}>{label}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const PAGE_TITLES = {
  '/sales_dashboard': 'Sales Dashboard',
  '/admin_dashboard': 'Admin Dashboard',
  '/analytics': 'Price Analytics',
  '/dynamic_analytics': 'Dynamic Analytics',
  '/alerts': 'Alerts',
  '/new_dashboard': 'Forecasts',
  '/approve_users': 'Approve Users',
  '/upload_historical': 'Upload Data',
};

function Layout({ children }) {
  const { isAuthenticated } = useContext(UserContext);
  const location = useLocation();

  const [tweaks, setTweaks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ark_tweaks')) || { theme: 'light', density: 'comfortable', accent: 'teal', nav: 'sidebar' }; }
    catch { return { theme: 'light', density: 'comfortable', accent: 'teal', nav: 'sidebar' }; }
  });
  const [tweaksOpen, setTweaksOpen] = useState(false);

  const setTweak = (k, v) => {
    const next = { ...tweaks, [k]: v };
    setTweaks(next);
    localStorage.setItem('ark_tweaks', JSON.stringify(next));
  };

  const title = PAGE_TITLES[location.pathname] || 'Dashboard';

  // Auth pages (login/register) get no sidebar wrapper
  if (!isAuthenticated) {
    return (
      <div data-theme={tweaks.theme} data-accent={tweaks.accent}>
        {children}
      </div>
    );
  }

  return (
    <div
      className="app"
      data-theme={tweaks.theme}
      data-density={tweaks.density}
      data-accent={tweaks.accent}
      data-sidebar={tweaks.nav === 'collapsed' ? 'collapsed' : 'expanded'}
    >
      <Sidebar />
      <div className="main">
        <Topbar title={title} tweaksOpen={tweaksOpen} setTweaksOpen={setTweaksOpen} />
        <div className="content">
          {children}
        </div>
      </div>
      <TweaksPanel tweaks={tweaks} setTweak={setTweak} open={tweaksOpen} setOpen={setTweaksOpen} />
    </div>
  );
}

export default Layout;
