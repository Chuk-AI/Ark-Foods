import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// ─── helpers ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
      <div style={{ width: 36, height: 36, border: '4px solid #e2e8f0', borderTop: '4px solid #059669', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', borderBottom: '3px solid #059669', paddingBottom: 10, marginBottom: 20 }}>
      {children}
    </h2>
  );
}

const STATUS_COLORS = {
  optimal:  { bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '#22c55e', badge: '#065f46', badgeBg: '#d1fae5' },
  warning:  { bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '#f59e0b', badge: '#92400e', badgeBg: '#fef3c7' },
  critical: { bg: 'linear-gradient(135deg,#fef2f2,#fee2e2)', border: '#ef4444', badge: '#991b1b', badgeBg: '#fee2e2' },
  caution:  { bg: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '#f97316', badge: '#9a3412', badgeBg: '#ffedd5' },
};

const growingColor = (s) =>
  s === 'optimal' ? '#22c55e' : s === 'warning' ? '#f59e0b' : '#ef4444';

// ─── 1. Live Weather Cards ────────────────────────────────────────────────────

function LiveWeatherCards() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetch = useCallback(() => {
    setLoading(true);
    axios.get('/api/live_weather')
      .then((r) => {
        setData(r.data.regions || []);
        setLastUpdated(new Date().toLocaleTimeString());
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const noKey = data?.every((r) => !r.weather?.temp);

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '3px solid #059669', paddingBottom: 10, marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>☁️ Regional Weather &amp; Growing Conditions</h2>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#22c55e', fontWeight: 700 }}>
          <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', animation: 'pulse2 1.5s infinite' }} />
          LIVE
          <style>{`@keyframes pulse2{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
        </span>
        <button onClick={fetch} style={{ marginLeft: 'auto', fontSize: 12, padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#475569', fontWeight: 600 }}>
          ↻ Refresh
        </button>
        {lastUpdated && <span style={{ fontSize: 11, color: '#94a3b8' }}>Updated {lastUpdated}</span>}
      </div>

      {noKey && (
        <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#92400e', marginBottom: 16 }}>
          ⚠️ Live weather requires <code>OPENWEATHER_API_KEY</code> in <code>.env</code>. Restart gunicorn after adding it.
        </div>
      )}
      {loading && <Spinner />}
      {error && <p style={{ color: '#dc2626' }}>Error: {error}</p>}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 18 }}>
          {data.map((region) => {
            const w = region.weather || {};
            const a = region.analysis || {};
            const status = (a.status || 'optimal').toLowerCase();
            const sc = STATUS_COLORS[status] || STATUS_COLORS.optimal;
            const hasWeather = w.temp != null;
            const alerts = (a.alerts || []).filter((al) => al.type === 'warning' || al.type === 'critical');
            return (
              <div key={region.key} style={{ background: sc.bg, borderLeft: `4px solid ${sc.border}`, borderRadius: 12, padding: 20, ...(status === 'critical' ? { animation: 'palert 2s infinite' } : {}) }}>
                <style>{`@keyframes palert{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.4)}50%{box-shadow:0 0 0 10px rgba(239,68,68,0)}}`}</style>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{region.name}</div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>{region.city}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    {hasWeather && <img src={`https://openweathermap.org/img/wn/${w.weather_icon}@2x.png`} alt={w.weather_desc} style={{ width: 48, height: 48 }} />}
                    <span style={{ background: sc.badgeBg, color: sc.badge, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{status}</span>
                  </div>
                </div>

                {hasWeather ? (
                  <>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#1e40af', margin: '6px 0' }}>{Math.round(w.temp)}°F</div>
                    <p style={{ color: '#64748b', textTransform: 'capitalize', fontSize: 13, marginBottom: 10 }}>{w.weather_desc}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, color: '#475569', marginBottom: 8 }}>
                      <span>💧 Humidity: <strong>{w.humidity}%</strong></span>
                      <span>💨 Wind: <strong>{w.wind_speed} mph</strong></span>
                      <span>☁️ Clouds: <strong>{w.clouds}%</strong></span>
                      <span>🌡️ Feels: <strong>{Math.round(w.feels_like)}°F</strong></span>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#94a3b8', margin: '10px 0' }}>No data</div>
                )}

                {alerts.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {alerts.slice(0, 2).map((alert, i) => (
                      <div key={i} style={{ background: alert.type === 'critical' ? '#fee2e2' : '#fef3c7', borderLeft: `4px solid ${alert.type === 'critical' ? '#dc2626' : '#f59e0b'}`, padding: '8px 10px', borderRadius: 6, fontSize: 11, marginBottom: 4 }}>
                        {alert.icon} {alert.message}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {(region.crops || []).map((crop) => (
                    <span key={crop} style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600 }}>{crop}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 2. 7-Day Weather Forecast ────────────────────────────────────────────────

function WeatherForecast7Day() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);

  useEffect(() => {
    axios.get('/api/weather_forecast_7day')
      .then((r) => {
        const regions = r.data.regions || [];
        setData(regions);
        if (regions.length) setSelectedRegion(regions[0].key);
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const region = data?.find((r) => r.key === selectedRegion);
  const forecast = region?.forecast;

  return (
    <div style={{ marginBottom: 40 }}>
      <SectionTitle>🌤️ 7-Day Weather Forecast by Region</SectionTitle>
      {loading && <Spinner />}
      {error && <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#92400e' }}>ℹ️ {error}</div>}
      {data && (
        <>
          {/* Region pill tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {data.map((r) => (
              <button key={r.key} onClick={() => setSelectedRegion(r.key)}
                style={{ padding: '7px 16px', borderRadius: 20, border: '2px solid', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all .15s',
                  borderColor: selectedRegion === r.key ? '#059669' : '#e2e8f0',
                  background: selectedRegion === r.key ? '#059669' : '#fff',
                  color: selectedRegion === r.key ? '#fff' : '#475569' }}>
                {r.name}
              </button>
            ))}
          </div>

          {/* Selected region forecast */}
          {region && forecast?.success && (
            <div style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 16 }}>{region.name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{forecast.city}</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(region.crops || []).map((crop) => (
                    <span key={crop} style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600 }}>{crop}</span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
                {(forecast.forecasts || []).slice(0, 7).map((day, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '10px 4px', background: '#f8fafc', borderRadius: 10, borderBottom: `4px solid ${growingColor(day.growing_status)}` }}>
                    <div style={{ fontWeight: 700, color: '#64748b', fontSize: 11, marginBottom: 4 }}>{day.day_name?.slice(0, 3)}</div>
                    <img src={`https://openweathermap.org/img/wn/${day.icon}.png`} alt={day.condition} style={{ width: 36 }} />
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>{Math.round(day.temp_high)}°</div>
                    <div style={{ color: '#94a3b8', fontSize: 11 }}>{Math.round(day.temp_low)}°</div>
                    <div style={{ fontSize: 10, color: '#3b82f6', marginTop: 2 }}>💧{day.humidity}%</div>
                    {day.rain_chance != null && (
                      <div style={{ fontSize: 10, color: '#06b6d4' }}>🌧{day.rain_chance}%</div>
                    )}
                    <div style={{ fontSize: 9, marginTop: 3, fontWeight: 700, color: growingColor(day.growing_status), textTransform: 'uppercase' }}>
                      {day.growing_status}
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 11, color: '#64748b' }}>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#22c55e', borderRadius: 2, marginRight: 4 }} />Optimal growing</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#f59e0b', borderRadius: 2, marginRight: 4 }} />Watch conditions</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ef4444', borderRadius: 2, marginRight: 4 }} />Critical stress</span>
              </div>
            </div>
          )}
          {region && !forecast?.success && (
            <div style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12, padding: 24, color: '#dc2626', fontSize: 13 }}>
              Forecast unavailable for {region.name}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── 3. Growing Conditions Reference ─────────────────────────────────────────

function GrowingConditions() {
  const [data, setData] = useState(null);
  useEffect(() => {
    axios.get('/api/growing_conditions').then((r) => setData(r.data.conditions || {})).catch(() => {});
  }, []);

  if (!data) return null;
  return (
    <div style={{ marginBottom: 40 }}>
      <SectionTitle>🌱 Ideal Growing Conditions by Variety</SectionTitle>
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', fontSize: 12, color: '#166534', marginBottom: 16 }}>
        Temperature and humidity ranges represent ideal conditions for flowering and fruit set. Readings outside these ranges trigger warning or critical alerts in the weather cards above.
      </div>
      <div style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff' }}>
                {['Variety', 'Temp Min (°F)', 'Temp Max (°F)', 'Ideal Temp Range', 'Humidity Min (%)', 'Humidity Max (%)', 'Ideal Humidity Range'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Variety' ? 'left' : 'center', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(data).map(([v, c], i) => (
                <tr key={v} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>{v}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b' }}>{c.temp_min ?? '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b' }}>{c.temp_max ?? '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#059669' }}>
                    {c.temp_min != null && c.temp_max != null ? `${c.temp_min}–${c.temp_max}°F` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b' }}>{c.humidity_min ?? '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b' }}>{c.humidity_max ?? '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: '#0284c7' }}>
                    {c.humidity_min != null && c.humidity_max != null ? `${c.humidity_min}–${c.humidity_max}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function WeatherDashboard() {
  return (
    <div style={{ padding: '28px 20px', maxWidth: 1600, margin: '0 auto', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif' }}>
      <LiveWeatherCards />
      <WeatherForecast7Day />
      <GrowingConditions />
    </div>
  );
}
