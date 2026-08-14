import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';

// ─── Field accessors ──────────────────────────────────────────────────────────

function n(v) { return v == null ? null : (isNaN(Number(v)) ? null : Number(v)); }
function getHi(d)   { return n(d.maxTemp); }
function getLo(d)   { return n(d.minTemp); }
function getAvg(d)  { return n(d.avgTemp); }
function getPrcp(d) { return n(d.prcp); }
function getGDD(d)  { return n(d.gdd); }
function getHum(d)  { return n(d.rh); }
function getWSpd(d) { return n(d.wspd); }
function getGust(d) { return n(d.gust); }
function getUV(d)   { return n(d.uv_index); }
function getPop(d)  { return n(d.pop); }
function getDate(d) { return d.utc_date_iso || d.utcDate || d.date || d.Date || d.week_start || ''; }

function fTemp(v)  { return v != null ? `${Math.round(Number(v))}°F` : '—'; }
function fPrcp(v)  { return v != null ? `${Number(v).toFixed(2)}"` : '—'; }
function fPct(v)   { return v != null ? `${Math.round(Number(v))}%` : '—'; }
function fSpd(v)   { return v != null ? `${Math.round(Number(v))} mph` : '—'; }

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_ABBR   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function fAlertTime(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString(undefined, { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }); }
  catch { return iso; }
}

function formatDateLabel(dateStr, withDay) {
  if (!dateStr) return '';
  const s = String(dateStr);
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const dt = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`);
    if (!isNaN(dt)) {
      const base = `${MONTH_ABBR[dt.getUTCMonth()]} ${dt.getUTCDate()}`;
      return withDay ? `${DAY_ABBR[dt.getUTCDay()]}\n${base}` : base;
    }
  }
  const digits = s.replace(/\D/g, '');
  if (digits.length >= 8) {
    const dt = new Date(`${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}`);
    if (!isNaN(dt)) return `${MONTH_ABBR[dt.getUTCMonth()]} ${dt.getUTCDate()}`;
  }
  return s;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}000000`;
}

// ─── Weather icon + label mapping ─────────────────────────────────────────────

const ICON_DATA = [
  { key: 'sunny',          emoji: '☀️',  label: 'Sunny' },
  { key: 'clear',          emoji: '☀️',  label: 'Clear' },
  { key: 'clear-day',      emoji: '☀️',  label: 'Clear' },
  { key: 'mostly-sunny',   emoji: '🌤',  label: 'Mostly Sunny' },
  { key: 'mostly-clear',   emoji: '🌤',  label: 'Mostly Clear' },
  { key: 'partly-sunny',   emoji: '⛅',  label: 'Partly Cloudy' },
  { key: 'partly-cloudy',  emoji: '⛅',  label: 'Partly Cloudy' },
  { key: 'mostly-cloudy',  emoji: '🌥',  label: 'Mostly Cloudy' },
  { key: 'cloudy',         emoji: '☁️',  label: 'Cloudy' },
  { key: 'overcast',       emoji: '☁️',  label: 'Overcast' },
  { key: 'fog',            emoji: '🌫',  label: 'Foggy' },
  { key: 'haze',           emoji: '🌫',  label: 'Hazy' },
  { key: 'drizzle',        emoji: '🌦',  label: 'Drizzle' },
  { key: 'light-rain',     emoji: '🌦',  label: 'Light Rain' },
  { key: 'sprinkles',      emoji: '🌦',  label: 'Sprinkles' },
  { key: 'rain',           emoji: '🌧',  label: 'Rainy' },
  { key: 'showers',        emoji: '🌧',  label: 'Showers' },
  { key: 'heavy-rain',     emoji: '🌧',  label: 'Heavy Rain' },
  { key: 'rain-showers',   emoji: '🌧',  label: 'Rain Showers' },
  { key: 'thunderstorm',   emoji: '⛈',  label: 'Thunderstorm' },
  { key: 'thundershowers', emoji: '⛈',  label: 'T-Showers' },
  { key: 'tstorms',        emoji: '⛈',  label: 'T-Storms' },
  { key: 't-storms',       emoji: '⛈',  label: 'T-Storms' },
  { key: 'thunder',        emoji: '⛈',  label: 'Thunder' },
  { key: 'snow',           emoji: '❄️',  label: 'Snow' },
  { key: 'heavy-snow',     emoji: '❄️',  label: 'Heavy Snow' },
  { key: 'light-snow',     emoji: '🌨',  label: 'Light Snow' },
  { key: 'snow-showers',   emoji: '🌨',  label: 'Snow Showers' },
  { key: 'sleet',          emoji: '🌨',  label: 'Sleet' },
  { key: 'freezing-rain',  emoji: '🌨',  label: 'Freezing Rain' },
  { key: 'wintry-mix',     emoji: '🌨',  label: 'Wintry Mix' },
  { key: 'windy',          emoji: '💨',  label: 'Windy' },
  { key: 'breezy',         emoji: '💨',  label: 'Breezy' },
];

function _resolveIcon(iconStr) {
  if (!iconStr) return null;
  const k = String(iconStr).toLowerCase().replace(/[ _]/g, '-');
  const exact = ICON_DATA.find(d => d.key === k);
  if (exact) return exact;
  return ICON_DATA.find(d => k.includes(d.key)) || null;
}

function weatherIcon(iconStr) {
  const d = _resolveIcon(iconStr);
  return d ? d.emoji : '🌡';
}

function weatherLabel(iconStr) {
  const d = _resolveIcon(iconStr);
  if (d) return d.label;
  if (!iconStr) return '';
  return String(iconStr).replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Frost colour coding ──────────────────────────────────────────────────────

function frostColor(tmin) {
  if (tmin == null) return null;
  const t = Number(tmin);
  if (t < 33)  return { bg: '#1e40af', text: '#fff', label: 'Freeze' };
  if (t < 38)  return { bg: '#0284c7', text: '#fff', label: 'Frost' };
  if (t < 42)  return { bg: '#bae6fd', text: '#0c4a6e', label: 'Patchy' };
  return null;
}

// ─── Shared constants ─────────────────────────────────────────────────────────

const WT360_LOCATION_KEYS = [
  { key: 'el_morro_mx',     label: 'El Morro, MX' },
  { key: 'ensenada_mx',     label: 'Ensenada, MX' },
  { key: 'culiacan_mx',     label: 'Culiacan, MX' },
  { key: 'huejotillo_mx',   label: 'Huejotillo, MX' },
  { key: 'sonora_mx',       label: 'Sonora, MX' },
  { key: 'arcadia_fl',      label: 'Arcadia, FL' },
  { key: 'immokalee_fl',    label: 'Immokalee, FL' },
  { key: 'palm_beach_fl',   label: 'Palm Beach, FL' },
  { key: 'adel_ga',         label: 'Adel, GA' },
  { key: 'lake_park_ga',    label: 'Lake Park, GA' },
  { key: 'sodus_mi',        label: 'Sodus, MI' },
  { key: 'vineland_nj',     label: 'Vineland, NJ' },
  { key: 'cameron_sc',      label: 'Cameron, SC' },
  { key: 'ridge_spring_sc', label: 'Ridge Spring, SC' },
];

const YOY_COLORS = ['#059669','#2563eb','#dc2626','#d97706','#7c3aed'];

// ─── UI primitives ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'wd-spin 0.9s linear infinite' }} />
      <style>{`@keyframes wd-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: color || 'var(--text)' }}>{value}</span>
    </div>
  );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'grid',       label: 'Multi-Farm Grid',    icon: '🗺' },
  { id: 'frost',      label: 'Frost & Freeze',     icon: '❄️' },
  { id: 'forecast',   label: '14-Day Detail',      icon: '📅' },
  { id: 'longrange',  label: 'Long-Range',         icon: '📈' },
  { id: 'yoy',        label: 'Year-on-Year',       icon: '📊' },
  { id: 'gdd',        label: 'GDD Tracker',        icon: '🌱' },
  { id: 'conditions', label: 'Growing Conditions', icon: '🌿' },
  { id: 'alerts',     label: 'Alerts',             icon: '⚠️' },
];

function TabBar({ active, onChange, alertCount }) {
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 24, overflowX: 'auto', flexShrink: 0 }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: active === t.id ? 700 : 500,
          color: active === t.id ? 'var(--accent)' : 'var(--text-2)',
          borderBottom: active === t.id ? '2px solid var(--accent)' : '2px solid transparent',
          marginBottom: -1, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5,
          transition: 'color .12s',
        }}>
          <span>{t.icon}</span>
          <span>{t.label}</span>
          {t.id === 'alerts' && alertCount > 0 && (
            <span style={{ background: 'var(--down)', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>{alertCount}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── 1. Multi-Farm Forecast Grid ──────────────────────────────────────────────

function MultiFarmGridTab({ regions, loading, error }) {
  const [days, setDays] = useState(7);

  if (loading) return <Spinner />;
  if (error)   return <div style={{ color: 'var(--down)', padding: 16 }}>Error: {error}</div>;
  if (!regions.length) return <div className="empty"><div className="empty-title">No data</div></div>;

  const maxDays = Math.min(days, Math.max(...regions.map(r => (r.forecast || []).length)));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
          One row per farm — compare weather conditions at a glance.
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {[7, 10, 14].map(d => (
            <button key={d} onClick={() => setDays(d)} className="btn btn-sm" style={{
              background: days === d ? 'var(--accent)' : 'var(--surface)',
              color: days === d ? '#fff' : 'var(--text-2)',
              borderColor: days === d ? 'var(--accent)' : 'var(--border)',
            }}>{d} days</button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 600 }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '2px solid var(--border)', position: 'sticky', left: 0, background: 'var(--surface-2)', zIndex: 2, minWidth: 130 }}>
                Location
              </th>
              {Array.from({ length: maxDays }, (_, i) => {
                const sampleForecast = regions[0]?.forecast || [];
                const d = sampleForecast[i];
                const dateStr = d ? formatDateLabel(getDate(d), true) : `Day ${i+1}`;
                const [dayLine, dateLine] = dateStr.includes('\n') ? dateStr.split('\n') : ['', dateStr];
                return (
                  <th key={i} style={{ padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', borderBottom: '2px solid var(--border)', minWidth: 64, whiteSpace: 'nowrap' }}>
                    <div style={{ color: 'var(--accent)', fontWeight: 700 }}>{dayLine}</div>
                    <div>{dateLine}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {regions.map((loc, ri) => {
              const forecast = loc.forecast || [];
              return (
                <tr key={loc.key} style={{ background: ri % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', position: 'sticky', left: 0, background: ri % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)', zIndex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap' }}>{loc.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{loc.state}</div>
                  </td>
                  {Array.from({ length: maxDays }, (_, i) => {
                    const d = forecast[i];
                    if (!d) return <td key={i} style={{ borderBottom: '1px solid var(--border)', padding: '8px', textAlign: 'center', color: 'var(--text-4)', fontSize: 11 }}>—</td>;
                    const hi = getHi(d);
                    const lo = getLo(d);
                    const pop = getPop(d);
                    const iconStr = d.icon || d.wx_icon || d.weather_icon || '';
                    const lbl = weatherLabel(iconStr);
                    return (
                      <td key={i} style={{ padding: '6px 4px', textAlign: 'center', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
                        <div title={lbl} style={{ fontSize: 20, lineHeight: 1, cursor: lbl ? 'default' : undefined }}>{weatherIcon(iconStr)}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginTop: 2 }}>{fTemp(hi)}</div>
                        <div style={{ fontSize: 10, color: '#2563eb' }}>{fTemp(lo)}</div>
                        {pop != null && pop > 20 && (
                          <div style={{ fontSize: 9, color: '#0284c7', marginTop: 1 }}>{fPct(pop)}</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-3)' }}>
        <span><span style={{ fontSize: 14 }}>☀️</span> Clear</span>
        <span><span style={{ fontSize: 14 }}>⛅</span> Partly Cloudy</span>
        <span><span style={{ fontSize: 14 }}>🌧</span> Rain</span>
        <span><span style={{ fontSize: 14 }}>⛈</span> Thunderstorms</span>
        <span><span style={{ fontSize: 14 }}>❄️</span> Snow</span>
        <span style={{ color: '#0284c7' }}>Blue % = precip chance when &gt;20%</span>
        <span style={{ fontStyle: 'italic' }}>Hover icons for weather description</span>
      </div>
    </div>
  );
}

// ─── 2. Frost & Freeze Risk ───────────────────────────────────────────────────

function FrostRiskTab({ regions, loading, error }) {
  if (loading) return <Spinner />;
  if (error)   return <div style={{ color: 'var(--down)', padding: 16 }}>Error: {error}</div>;
  if (!regions.length) return <div className="empty"><div className="empty-title">No data</div></div>;

  const hasFrost = regions.some(loc =>
    (loc.forecast || []).some(d => { const lo = getLo(d); return lo != null && lo < 42; })
  );

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
        Highlights days where minimum temperatures approach or fall below freezing across all farm locations.
        {!hasFrost && <strong style={{ color: 'var(--up)', marginLeft: 8 }}>✓ No frost risk detected in the next 14 days.</strong>}
      </p>

      {/* Colour legend */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { bg: '#bae6fd', text: '#0c4a6e', label: '38–42°F  Patchy Frost Possible' },
          { bg: '#0284c7', text: '#fff',    label: '33–38°F  Frost Possible' },
          { bg: '#1e40af', text: '#fff',    label: '< 33°F   Freeze Possible' },
        ].map(c => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <div style={{ width: 20, height: 20, background: c.bg, borderRadius: 4, border: '1px solid rgba(0,0,0,.12)' }} />
            <span style={{ color: 'var(--text-2)' }}>{c.label}</span>
          </div>
        ))}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 600 }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '2px solid var(--border)', position: 'sticky', left: 0, background: 'var(--surface-2)', zIndex: 2, minWidth: 130 }}>
                Location
              </th>
              {(regions[0]?.forecast || []).map((d, i) => {
                const dateStr = formatDateLabel(getDate(d), true);
                const [dayLine, dateLine] = dateStr.includes('\n') ? dateStr.split('\n') : ['', dateStr];
                return (
                  <th key={i} style={{ padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', borderBottom: '2px solid var(--border)', minWidth: 52 }}>
                    <div style={{ color: 'var(--accent)', fontWeight: 700 }}>{dayLine}</div>
                    <div>{dateLine}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {regions.map((loc, ri) => {
              const forecast = loc.forecast || [];
              const rowHasFrost = forecast.some(d => { const lo = getLo(d); return lo != null && lo < 42; });
              return (
                <tr key={loc.key} style={{ background: ri % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)', opacity: rowHasFrost ? 1 : 0.6 }}>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', position: 'sticky', left: 0, background: ri % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)', zIndex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap' }}>{loc.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{loc.state}</div>
                  </td>
                  {forecast.map((d, i) => {
                    const lo  = getLo(d);
                    const fc  = frostColor(lo);
                    return (
                      <td key={i} style={{ padding: '6px 4px', textAlign: 'center', borderBottom: '1px solid var(--border)', background: fc ? fc.bg : 'transparent', transition: 'background .1s' }}>
                        <div style={{ fontSize: 11, fontWeight: fc ? 700 : 500, color: fc ? fc.text : 'var(--text-2)' }}>
                          {fTemp(lo)}
                        </div>
                        {fc && <div style={{ fontSize: 9, color: fc.text, opacity: 0.85 }}>{fc.label}</div>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 3. 14-Day Detail (single location) ──────────────────────────────────────

function ForecastDetailTab({ defaultLocation }) {
  const [locKey,   setLocKey]   = useState(defaultLocation?.key || 'vineland_nj');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const fetchForecast = useCallback((key) => {
    setLoading(true); setError(null);
    axios.get(`/api/wt360/forecast/${key}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchForecast(locKey); }, [locKey]);

  const days = data?.forecast || [];

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Location</label>
          <select value={locKey} onChange={e => setLocKey(e.target.value)} className="form-select" style={{ width: 200 }}>
            {WT360_LOCATION_KEYS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? <Spinner /> : error ? (
        <div style={{ color: 'var(--down)', padding: 16 }}>Error: {error}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                {['Day','Date','Conditions','High','Low','PoP','Precip','Humidity','Wind','UV'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => {
                const dateStr = formatDateLabel(getDate(d), true);
                const [dayLine, dateLine] = dateStr.includes('\n') ? dateStr.split('\n') : ['', dateStr];
                const iconStr = d.icon || d.wx_icon || '';
                const lbl = weatherLabel(iconStr);
                return (
                  <tr key={i}>
                    <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{dayLine}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{dateLine}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span title={lbl} style={{ fontSize: 18 }}>{weatherIcon(iconStr)}</span>
                        {lbl && <span style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{lbl}</span>}
                      </div>
                    </td>
                    <td style={{ color: '#dc2626', fontWeight: 700 }}>{fTemp(getHi(d))}</td>
                    <td style={{ color: '#2563eb', fontWeight: 700 }}>{fTemp(getLo(d))}</td>
                    <td>{fPct(getPop(d))}</td>
                    <td style={{ color: 'var(--c1)' }}>{fPrcp(getPrcp(d))}</td>
                    <td style={{ color: 'var(--c7)' }}>{fPct(getHum(d))}</td>
                    <td>{getWSpd(d) != null ? fSpd(getWSpd(d)) : '—'}{getGust(d) != null ? ` (g ${Math.round(getGust(d))})` : ''}</td>
                    <td style={{ color: 'var(--warn)' }}>{getUV(d) != null ? Number(getUV(d)).toFixed(1) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── 4. Long-Range Outlook ────────────────────────────────────────────────────

function LongRangeTab() {
  const [locKey,   setLocKey]   = useState('vineland_nj');
  const [weeks,    setWeeks]    = useState(12);
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const chartRef  = useRef(null);
  const chartInst = useRef(null);

  const fetchData = useCallback(() => {
    setLoading(true); setError(null);
    axios.get('/api/wt360/longrange', { params: { loc_id: locKey, start_date: todayStr(), weeks, fields: 'avgTemp,maxTemp,minTemp,prcp' } })
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [locKey, weeks]);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!data || !chartRef.current) return;
    const wdata = (data.weekly_data || []).filter(w => getAvg(w) != null || getHi(w) != null || getLo(w) != null);
    if (wdata.length === 0) return;
    const labels   = wdata.map((w, i) => { const d = getDate(w); return d ? formatDateLabel(d) : `Wk ${i+1}`; });
    if (chartInst.current) chartInst.current.destroy();
    chartInst.current = new Chart(chartRef.current.getContext('2d'), {
      type: 'bar',
      data: { labels, datasets: [
        { type: 'line', label: 'Avg Temp (°F)', data: wdata.map(w => getAvg(w)), borderColor: '#059669', backgroundColor: 'rgba(5,150,105,.1)', tension: .3, yAxisID: 'y', pointRadius: 3 },
        { type: 'line', label: 'High (°F)',     data: wdata.map(w => getHi(w)),  borderColor: '#dc2626', borderDash: [4,3], backgroundColor: 'transparent', tension: .3, yAxisID: 'y', pointRadius: 2 },
        { type: 'line', label: 'Low (°F)',      data: wdata.map(w => getLo(w)),  borderColor: '#2563eb', borderDash: [4,3], backgroundColor: 'transparent', tension: .3, yAxisID: 'y', pointRadius: 2 },
        { type: 'bar',  label: 'Precip (in)',   data: wdata.map(w => getPrcp(w)), backgroundColor: 'rgba(14,165,233,.35)', yAxisID: 'y2' },
      ]},
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top' }, datalabels: { display: false } },
        scales: {
          y:  { title: { display: true, text: 'Temperature (°F)' }, position: 'left' },
          y2: { title: { display: true, text: 'Precip (in)' }, position: 'right', grid: { drawOnChartArea: false }, beginAtZero: true },
          x:  { ticks: { maxRotation: 45, maxTicksLimit: 16 } },
        }
      }
    });
  }, [data]);

  useEffect(() => () => { if (chartInst.current) chartInst.current.destroy(); }, []);

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
        Weekly temperature and precipitation outlook. Only weeks with valid forecast data are shown — weeks beyond the forecast horizon are automatically excluded.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Location</label>
          <select value={locKey} onChange={e => setLocKey(e.target.value)} className="form-select" style={{ width: 200 }}>
            {WT360_LOCATION_KEYS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Horizon: {weeks} weeks</label>
          <input type="range" min={2} max={46} value={weeks} onChange={e => setWeeks(Number(e.target.value))} style={{ width: 160, accentColor: 'var(--accent)' }} />
        </div>
        <button onClick={fetchData} className="btn btn-primary" disabled={loading}>{loading ? 'Loading…' : 'Update Chart'}</button>
      </div>
      {error && <div style={{ color: 'var(--down)', marginBottom: 12, fontSize: 13 }}>Error: {error}</div>}
      <div style={{ position: 'relative', height: 380 }}>{loading ? <Spinner /> : <canvas ref={chartRef} />}</div>
    </div>
  );
}

// ─── 5. Year-on-Year Analysis ─────────────────────────────────────────────────

const MONTH_OPTS = [
  { val: '01', label: 'January' },  { val: '02', label: 'February' }, { val: '03', label: 'March' },
  { val: '04', label: 'April' },    { val: '05', label: 'May' },      { val: '06', label: 'June' },
  { val: '07', label: 'July' },     { val: '08', label: 'August' },   { val: '09', label: 'September' },
  { val: '10', label: 'October' },  { val: '11', label: 'November' }, { val: '12', label: 'December' },
];

const YOY_METRICS = [
  { val: 'avgTemp', label: 'Avg Temp',  accessor: getAvg,  fmt: fTemp },
  { val: 'maxTemp', label: 'High Temp', accessor: getHi,   fmt: fTemp },
  { val: 'minTemp', label: 'Low Temp',  accessor: getLo,   fmt: fTemp },
  { val: 'prcp',    label: 'Precip',    accessor: getPrcp, fmt: fPrcp },
  { val: 'gdd',     label: 'GDD',       accessor: getGDD,  fmt: v => v != null ? Number(v).toFixed(1) : '—' },
];

function YoYTab() {
  const [locKey,   setLocKey]   = useState('vineland_nj');
  const [startMM,  setStartMM]  = useState('01');
  const [endMM,    setEndMM]    = useState('12');
  const [numYears, setNumYears] = useState(3);
  const [metric,   setMetric]   = useState('avgTemp');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const chartRef  = useRef(null);
  const chartInst = useRef(null);

  const fetchData = useCallback(() => {
    setLoading(true); setError(null);
    const endDay  = new Date(2000, parseInt(endMM), 0).getDate();
    axios.get('/api/wt360/yoy', {
      params: { loc_id: locKey, start_mmdd: `${startMM}01`, end_mmdd: `${endMM}${endDay}`, years: numYears, fields: 'avgTemp,maxTemp,minTemp,prcp,gdd' }
    })
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [locKey, startMM, endMM, numYears]);

  useEffect(() => { fetchData(); }, []);

  const metricDef = YOY_METRICS.find(m => m.val === metric) || YOY_METRICS[0];

  useEffect(() => {
    if (!data || !chartRef.current) return;
    const yearsData = data.years || {};
    const years = Object.keys(yearsData).sort().reverse();
    if (!years.length) return;
    const datasets = years.map((yr, i) => ({
      label: yr,
      data: (yearsData[yr] || []).map(d => metricDef.accessor(d)),
      borderColor: YOY_COLORS[i % YOY_COLORS.length],
      backgroundColor: 'transparent',
      tension: 0.3, pointRadius: 0, pointHoverRadius: 3,
      borderWidth: i === 0 ? 2.5 : 1.5,
    }));
    const maxLen = Math.max(...years.map(yr => (yearsData[yr] || []).length));
    // Use the year with the most data for labels so we get full Jan–Dec coverage
    const labelYear = years.reduce((best, yr) =>
      (yearsData[yr] || []).length > (yearsData[best] || []).length ? yr : best, years[0]);
    const labelData = yearsData[labelYear] || [];
    const labels = Array.from({ length: maxLen }, (_, i) => {
      const d = labelData[i];
      if (d) { const ds = getDate(d); if (ds) return formatDateLabel(ds); }
      return `Day ${i+1}`;
    });
    if (chartInst.current) chartInst.current.destroy();
    chartInst.current = new Chart(chartRef.current.getContext('2d'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top' }, datalabels: { display: false } },
        scales: {
          x: { ticks: { maxTicksLimit: 12, maxRotation: 0 } },
          y: { title: { display: true, text: metricDef.label } },
        }
      }
    });
  }, [data, metric]);

  useEffect(() => () => { if (chartInst.current) chartInst.current.destroy(); }, []);

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>
        Compare the same date range across multiple years to identify seasonal patterns, warming trends, and anomalies.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Location</label>
          <select value={locKey} onChange={e => setLocKey(e.target.value)} className="form-select" style={{ width: 180 }}>
            {WT360_LOCATION_KEYS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>From Month</label>
          <select value={startMM} onChange={e => setStartMM(e.target.value)} className="form-select" style={{ width: 140 }}>
            {MONTH_OPTS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>To Month</label>
          <select value={endMM} onChange={e => setEndMM(e.target.value)} className="form-select" style={{ width: 140 }}>
            {MONTH_OPTS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Years back</label>
          <select value={numYears} onChange={e => setNumYears(Number(e.target.value))} className="form-select" style={{ width: 100 }}>
            {[2,3,4,5].map(v => <option key={v} value={v}>{v} years</option>)}
          </select>
        </div>
        <button onClick={fetchData} className="btn btn-primary" disabled={loading}>{loading ? 'Fetching data…' : 'Compare Years'}</button>
      </div>

      {data && !loading && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {YOY_METRICS.map((m, mi) => (
            <button key={m.val} onClick={() => setMetric(m.val)} className="btn btn-sm" style={{
              background: metric === m.val ? YOY_COLORS[mi] : 'var(--surface)',
              color: metric === m.val ? 'white' : 'var(--text-2)',
              borderColor: metric === m.val ? YOY_COLORS[mi] : 'var(--border)',
            }}>{m.label}</button>
          ))}
        </div>
      )}

      {error && <div style={{ color: 'var(--down)', marginBottom: 12, fontSize: 13 }}>Error: {error}</div>}
      {loading && <><Spinner /><p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>Fetching daily records from WT360 — this may take 10–15 seconds for a full year…</p></>}
      {!loading && (data || error) && (
        <div style={{ position: 'relative', height: 380 }}><canvas ref={chartRef} /></div>
      )}

      {data && !loading && (() => {
        const yearsData = data.years || {};
        const years = Object.keys(yearsData).sort().reverse();
        const isTotal = metric === 'prcp' || metric === 'gdd';
        return (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Year Summary — {metricDef.label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
              {years.map((yr, i) => {
                const wx = yearsData[yr] || [];
                const vals = wx.map(metricDef.accessor).filter(v => v != null);
                if (!vals.length) return null;
                const avg = vals.reduce((a,b) => a+b, 0) / vals.length;
                const sum = vals.reduce((a,b) => a+b, 0);
                return (
                  <div key={yr} style={{ background: 'var(--surface-2)', border: `1px solid ${YOY_COLORS[i%YOY_COLORS.length]}40`, borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: YOY_COLORS[i%YOY_COLORS.length], marginBottom: 6 }}>{yr}</div>
                    {isTotal ? (
                      <Stat label="Total" value={metricDef.fmt(sum)} />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <Stat label="Avg" value={metricDef.fmt(avg)} />
                        <Stat label="Peak" value={metricDef.fmt(Math.max(...vals))} color="var(--down)" />
                        <Stat label="Low"  value={metricDef.fmt(Math.min(...vals))} color="var(--c2)" />
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 4 }}>{vals.length} days</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── 6. GDD Tracker ───────────────────────────────────────────────────────────

const GDD_MILESTONES = [
  { gdd: 200,  label: 'Germination / Seedling' },
  { gdd: 600,  label: 'Vegetative Growth' },
  { gdd: 900,  label: 'Flowering / Budset' },
  { gdd: 1200, label: 'Fruit Development' },
  { gdd: 1500, label: 'Harvest Readiness' },
];

function GDDTab() {
  const [locKey,     setLocKey]     = useState('vineland_nj');
  const [plantDate,  setPlantDate]  = useState(() => { const d = new Date(); d.setMonth(d.getMonth()-2); return d.toISOString().slice(0,10); });
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const chartRef  = useRef(null);
  const chartInst = useRef(null);

  const fetchData = useCallback(() => {
    setLoading(true); setError(null);
    const today = new Date();
    const plant = new Date(plantDate);
    const days  = Math.max(1, Math.round((today - plant) / 86400000));
    const startParam = plantDate.replace(/-/g,'') + '000000';
    axios.get('/api/wt360/historical', { params: { loc_id: locKey, start_date: startParam, days, fields: 'gdd,avgTemp,maxTemp,minTemp' } })
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [locKey, plantDate]);

  // Auto-fetch on mount
  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!data || !chartRef.current) return;
    const rawDays = data.daily_data || [];
    if (!rawDays.length) return;
    let cum = 0;
    const cumGDD = rawDays.map(d => { cum += Number(getGDD(d) ?? 0) || 0; return parseFloat(cum.toFixed(1)); });
    const labels  = rawDays.map((d, i) => {
      const dt = getDate(d);
      return dt ? formatDateLabel(dt) : `Day ${i+1}`;
    });
    const maxGDD = cumGDD[cumGDD.length - 1] || 0;

    if (chartInst.current) chartInst.current.destroy();
    chartInst.current = new Chart(chartRef.current.getContext('2d'), {
      type: 'line',
      data: { labels, datasets: [
        {
          label: 'Cumulative GDD (base 50°F)',
          data: cumGDD,
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124,58,237,.12)',
          fill: true, tension: .35, pointRadius: 0, pointHoverRadius: 4,
          borderWidth: 2.5,
        },
      ]},
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          datalabels: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `GDD accumulated: ${ctx.parsed.y.toFixed(1)}`,
              afterBody: (items) => {
                const val = items[0]?.parsed?.y;
                if (val == null) return [];
                const stage = [...GDD_MILESTONES].reverse().find(m => val >= m.gdd);
                return stage ? [`Stage: ${stage.label}`] : ['Stage: Pre-germination'];
              },
            }
          },
          annotation: undefined,
        },
        scales: {
          y: {
            title: { display: true, text: 'Growing Degree Days (cumulative, base 50°F)' },
            beginAtZero: true,
            suggestedMax: Math.max(maxGDD * 1.1, 200),
          },
          x: {
            ticks: { maxRotation: 45, maxTicksLimit: 14 },
            title: { display: true, text: 'Date' },
          }
        }
      }
    });
  }, [data]);

  useEffect(() => () => { if (chartInst.current) chartInst.current.destroy(); }, []);

  const rawDays = data?.daily_data || [];
  const totalGDD = rawDays.reduce((s, d) => s + (Number(getGDD(d) ?? 0) || 0), 0);
  const currentStage = [...GDD_MILESTONES].reverse().find(m => totalGDD >= m.gdd);
  const nextMilestone = GDD_MILESTONES.find(m => totalGDD < m.gdd);

  return (
    <div>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: 'var(--text)' }}>What is GDD?</div>
        <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
          Growing Degree Days (GDD) measure heat accumulation to predict crop development stages. Each day contributes
          GDD = max(0, avg daily temp − 50°F). Select a planting date and location to see accumulated heat units from
          that date through today.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Location</label>
          <select value={locKey} onChange={e => setLocKey(e.target.value)} className="form-select" style={{ width: 180 }}>
            {WT360_LOCATION_KEYS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Planting Date</label>
          <input type="date" value={plantDate} onChange={e => setPlantDate(e.target.value)} className="form-control" style={{ width: 160 }} />
        </div>
        <button onClick={fetchData} className="btn" style={{ background: '#7c3aed', color: '#fff', borderColor: '#7c3aed' }} disabled={loading}>
          {loading ? 'Loading…' : 'Update'}
        </button>

        {data && !loading && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ background: 'oklch(0.94 0.04 300)', border: '1px solid oklch(0.78 0.09 300)', borderRadius: 8, padding: '8px 16px', fontWeight: 700, color: '#5b21b6', fontSize: 14 }}>
              {totalGDD.toFixed(1)} GDD
            </div>
            {currentStage && (
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: 'var(--text-2)' }}>
                📍 <strong>{currentStage.label}</strong>
              </div>
            )}
            {nextMilestone && (
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: 'var(--text-3)' }}>
                Next: {nextMilestone.label} at {nextMilestone.gdd} GDD (+{(nextMilestone.gdd - totalGDD).toFixed(0)} needed)
              </div>
            )}
          </div>
        )}
      </div>

      {error && <div style={{ color: 'var(--down)', marginBottom: 12, fontSize: 13 }}>Error: {error}</div>}
      <div style={{ position: 'relative', height: 340 }}>{loading ? <Spinner /> : <canvas ref={chartRef} />}</div>

      {/* GDD milestone reference */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Pepper Development Milestones (approximate)</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {GDD_MILESTONES.map(m => {
            const reached = totalGDD >= m.gdd;
            return (
              <div key={m.gdd} style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
                padding: '5px 10px', borderRadius: 6,
                background: reached ? 'oklch(0.94 0.04 300)' : 'var(--surface-2)',
                border: `1px solid ${reached ? 'oklch(0.78 0.09 300)' : 'var(--border)'}`,
                color: reached ? '#5b21b6' : 'var(--text-3)',
                fontWeight: reached ? 700 : 400,
              }}>
                {reached ? '✓' : '○'} {m.gdd} GDD — {m.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── 7. Growing Conditions ────────────────────────────────────────────────────

const GROWING_CONDITIONS = {
  'Jalapeno':      { tempMin: 65, tempMax: 85, humMin: 40, humMax: 70, gddTarget: 1200 },
  'Serrano':       { tempMin: 65, tempMax: 90, humMin: 40, humMax: 70, gddTarget: 1400 },
  'Poblano':       { tempMin: 60, tempMax: 85, humMin: 40, humMax: 70, gddTarget: 1100 },
  'Habanero':      { tempMin: 70, tempMax: 90, humMin: 50, humMax: 75, gddTarget: 1500 },
  'Anaheim':       { tempMin: 65, tempMax: 90, humMin: 30, humMax: 65, gddTarget: 1300 },
  'Cubanelle':     { tempMin: 60, tempMax: 85, humMin: 40, humMax: 70, gddTarget: 1000 },
  'Fresno':        { tempMin: 65, tempMax: 85, humMin: 40, humMax: 65, gddTarget: 1200 },
  'Hungarian Wax': { tempMin: 65, tempMax: 85, humMin: 40, humMax: 65, gddTarget: 1100 },
  'Shishito':      { tempMin: 60, tempMax: 85, humMin: 40, humMax: 70, gddTarget: 900  },
  'Long Hot':      { tempMin: 65, tempMax: 85, humMin: 40, humMax: 65, gddTarget: 1200 },
};

function ConditionsTab() {
  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>Optimal growing ranges for Ark Foods pepper varieties. Use GDD Target with the GDD Tracker to estimate crop readiness.</p>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>{['Variety','Min Temp (°F)','Max Temp (°F)','Min Humidity (%)','Max Humidity (%)','GDD Target'].map(h => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {Object.entries(GROWING_CONDITIONS).map(([name, c]) => (
              <tr key={name}>
                <td style={{ fontWeight: 600, color: 'var(--text)' }}>{name}</td>
                <td style={{ color: 'var(--c2)' }}>{c.tempMin}</td>
                <td style={{ color: 'var(--down)' }}>{c.tempMax}</td>
                <td style={{ color: 'var(--c1)' }}>{c.humMin}</td>
                <td style={{ color: 'var(--c1)' }}>{c.humMax}</td>
                <td style={{ color: 'var(--c5)', fontWeight: 600 }}>{c.gddTarget}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 8. Alerts Tab ────────────────────────────────────────────────────────────

function AlertsTab() {
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchAlerts = useCallback(() => {
    setLoading(true); setError(null);
    axios.get('/api/wt360/alerts')
      .then(r => {
        const all = [];
        (r.data.alerts || []).forEach(loc => {
          (loc.alerts || []).forEach(a => all.push({ ...a, location: loc.name }));
        });
        setAlerts(all);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAlerts(); }, []);

  if (loading) return <Spinner />;
  if (error)   return <div style={{ color: 'var(--down)', padding: 16 }}>Error loading alerts: {error}</div>;

  if (alerts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>No Active Alerts</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>All monitored locations are clear. No severe weather warnings at this time.</div>
        <button onClick={fetchAlerts} className="btn btn-sm" style={{ marginTop: 20 }}>Refresh</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontWeight: 700, color: 'var(--down)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚠️ {alerts.length} Active Alert{alerts.length !== 1 ? 's' : ''} Across Your Farm Locations
        </div>
        <button onClick={fetchAlerts} className="btn btn-sm">Refresh</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {alerts.map((a, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid oklch(0.62 0.18 25/0.25)', borderLeft: '4px solid var(--down)', borderRadius: 8, padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--down)' }}>{a.title || 'Weather Alert'}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '3px 10px', borderRadius: 10, border: '1px solid var(--border)' }}>
                📍 {a.location}
              </span>
            </div>
            {(a.start || a.end) && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {a.start && <span>🕐 From {fAlertTime(a.start)}</span>}
                {a.end && <span>Until {fAlertTime(a.end)}</span>}
              </div>
            )}
            {a.content && (
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65, background: 'var(--surface-2)', borderRadius: 6, padding: '10px 12px' }}>
                {a.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function WeatherDashboard() {
  const [activeTab,        setActiveTab]        = useState('grid');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [alertCount,       setAlertCount]       = useState(0);

  // Shared forecast_all data — used by Multi-Farm Grid and Frost Risk tabs
  const [regions,  setRegions]  = useState([]);
  const [regLoad,  setRegLoad]  = useState(true);
  const [regError, setRegError] = useState(null);

  useEffect(() => {
    axios.get('/api/wt360/forecast_all')
      .then(r => setRegions(r.data.locations || []))
      .catch(e => setRegError(e.message))
      .finally(() => setRegLoad(false));
  }, []);

  // Fetch alert count for badge (lightweight — just count)
  useEffect(() => {
    axios.get('/api/wt360/alerts')
      .then(r => {
        let count = 0;
        (r.data.alerts || []).forEach(loc => { count += (loc.alerts || []).length; });
        setAlertCount(count);
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-h1">Weather Intelligence</h1>
          <p className="page-sub">Powered by WeatherTrends360 — 14 growing regions across USA &amp; Mexico</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-body">
          <TabBar active={activeTab} onChange={setActiveTab} alertCount={alertCount} />

          {activeTab === 'grid' && (
            <MultiFarmGridTab regions={regions} loading={regLoad} error={regError} />
          )}

          {activeTab === 'frost' && (
            <FrostRiskTab regions={regions} loading={regLoad} error={regError} />
          )}

          {activeTab === 'forecast' && (
            <ForecastDetailTab defaultLocation={selectedLocation} />
          )}

          {activeTab === 'longrange' && <LongRangeTab />}

          {activeTab === 'yoy' && <YoYTab />}

          {activeTab === 'gdd' && <GDDTab />}

          {activeTab === 'conditions' && <ConditionsTab />}

          {activeTab === 'alerts' && <AlertsTab />}
        </div>
      </div>
    </div>
  );
}
