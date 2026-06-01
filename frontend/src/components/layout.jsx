import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './Sidebar';
import { UserContext } from './userContext';
import '../styles/styles.css';

// ── Icons ────────────────────────────────────────────────────────────────────
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
const PageIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
);
const TagIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);
const CityIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/>
  </svg>
);

// ── Command Palette ───────────────────────────────────────────────────────────
function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ pages: [], commodities: [], cities: [] });
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  // Focus input when palette opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults({ pages: [], commodities: [], cities: [] });
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults({ pages: [], commodities: [], cities: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/search?q=${encodeURIComponent(query)}`);
        setResults(res.data);
        setActiveIdx(0);
      } catch {
        setResults({ pages: [], commodities: [], cities: [] });
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Flatten all items for keyboard nav
  const allItems = [
    ...results.pages.map(p => ({ type: 'page', label: p.label, path: p.path })),
    ...results.commodities.map(c => ({ type: 'commodity', label: c, path: `/analytics?commodity=${encodeURIComponent(c)}` })),
    ...results.cities.map(c => ({ type: 'city', label: c, path: `/analytics?city=${encodeURIComponent(c)}` })),
  ];

  const handleSelect = useCallback((item) => {
    navigate(item.path);
    onClose();
  }, [navigate, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, allItems.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && allItems[activeIdx]) { handleSelect(allItems[activeIdx]); }
  };

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!open) return null;

  const hasResults = allItems.length > 0;
  let itemIdx = 0;

  const renderGroup = (label, items, type) => {
    if (!items.length) return null;
    const icon = type === 'page' ? <PageIcon /> : type === 'commodity' ? <TagIcon /> : <CityIcon />;
    return (
      <div className="cp-group" key={type}>
        <div className="cp-group-label">{label}</div>
        {items.map(item => {
          const idx = itemIdx++;
          const path = type === 'page' ? item.path : type === 'commodity'
            ? `/analytics?commodity=${encodeURIComponent(item)}`
            : `/analytics?city=${encodeURIComponent(item)}`;
          const label2 = type === 'page' ? item.label : item;
          return (
            <div
              key={label2}
              data-idx={idx}
              className={`cp-item ${idx === activeIdx ? 'active' : ''}`}
              onMouseEnter={() => setActiveIdx(idx)}
              onMouseDown={(e) => { e.preventDefault(); handleSelect({ type, label: label2, path }); }}
            >
              <span className="cp-item-icon">{icon}</span>
              <span className="cp-item-label">{label2}</span>
              {type !== 'page' && (
                <span className="cp-item-hint">
                  {type === 'commodity' ? 'View in Analytics →' : 'Filter by city →'}
                </span>
              )}
              {type === 'page' && <span className="cp-item-hint">Go to page →</span>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="cp-overlay" onMouseDown={onClose}>
      <div className="cp-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="cp-input-row">
          <SearchIcon />
          <input
            ref={inputRef}
            className="cp-input"
            placeholder="Search pages, commodities, cities…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {loading && <span className="cp-spinner" />}
          {!loading && query && (
            <button className="cp-clear" onMouseDown={e => { e.preventDefault(); setQuery(''); }}>
              <XIcon />
            </button>
          )}
          <kbd className="cp-esc-hint">esc</kbd>
        </div>

        <div className="cp-body" ref={listRef}>
          {!query && (
            <div className="cp-empty">
              Start typing to search pages, commodities, and cities.
            </div>
          )}
          {query && !loading && !hasResults && (
            <div className="cp-empty">No results for "<strong>{query}</strong>"</div>
          )}
          {hasResults && (
            <>
              {renderGroup('Pages', results.pages, 'page')}
              {renderGroup('Commodities', results.commodities, 'commodity')}
              {renderGroup('Cities', results.cities, 'city')}
            </>
          )}
        </div>

        <div className="cp-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────
function Topbar({ title, tweaksOpen, setTweaksOpen, onSearchOpen }) {
  return (
    <header className="topbar">
      <div className="topbar-crumb">
        <span>Ark Foods</span>
        <span className="sep">/</span>
        <span className="topbar-title">{title}</span>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="search" onClick={onSearchOpen} title="Search (⌘K)">
          <SearchIcon />
          <span>Search…</span>
          <kbd>⌘K</kbd>
        </button>
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

// ── Tweaks Panel ──────────────────────────────────────────────────────────────
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

// ── Layout ────────────────────────────────────────────────────────────────────
function Layout({ children }) {
  const { isAuthenticated } = useContext(UserContext);
  const location = useLocation();

  const [tweaks, setTweaks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ark_tweaks')) || { theme: 'light', density: 'comfortable', accent: 'teal', nav: 'sidebar' }; }
    catch { return { theme: 'light', density: 'comfortable', accent: 'teal', nav: 'sidebar' }; }
  });
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const setTweak = (k, v) => {
    const next = { ...tweaks, [k]: v };
    setTweaks(next);
    localStorage.setItem('ark_tweaks', JSON.stringify(next));
  };

  // ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const title = PAGE_TITLES[location.pathname] || 'Dashboard';

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
        <Topbar title={title} tweaksOpen={tweaksOpen} setTweaksOpen={setTweaksOpen} onSearchOpen={() => setSearchOpen(true)} />
        <div className="content">
          {children}
        </div>
      </div>
      <TweaksPanel tweaks={tweaks} setTweak={setTweak} open={tweaksOpen} setOpen={setTweaksOpen} />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

export default Layout;
