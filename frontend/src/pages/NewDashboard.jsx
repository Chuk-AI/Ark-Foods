import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (v) => (v != null ? `$${Number(v).toFixed(2)}` : '—');
const pct = (v) => (v != null ? `${Number(v).toFixed(1)}%` : '—');

function TrendBadge({ badge, trend }) {
  // backend sends trend_badge="danger/success/warning" and overall_trend="RISING/FALLING/STABLE"
  const label = trend || badge || '';
  const map = {
    RISING:  { bg: '#fee2e2', color: '#dc2626' },
    FALLING: { bg: '#dcfce7', color: '#16a34a' },
    STABLE:  { bg: '#fef9c3', color: '#ca8a04' },
    danger:  { bg: '#fee2e2', color: '#dc2626' },
    success: { bg: '#dcfce7', color: '#16a34a' },
    warning: { bg: '#fef9c3', color: '#ca8a04' },
  };
  const s = map[label] || { bg: '#f1f5f9', color: '#64748b' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
      letterSpacing: '0.04em', whiteSpace: 'nowrap',
    }}>
      {label || 'UNKNOWN'}
    </span>
  );
}

function ConfidencePill({ value }) {
  let bg = '#fee2e2', color = '#dc2626';
  if (value >= 0.7)       { bg = '#dcfce7'; color = '#16a34a'; }
  else if (value >= 0.5)  { bg = '#fef9c3'; color = '#ca8a04'; }
  return (
    <span style={{ background: bg, color, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
      {(value * 100).toFixed(0)}%
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    optimal:  { bg: '#dcfce7', color: '#16a34a' },
    warning:  { bg: '#fef9c3', color: '#ca8a04' },
    critical: { bg: '#fee2e2', color: '#dc2626' },
    caution:  { bg: '#ffedd5', color: '#ea580c' },
  };
  const s = map[(status || '').toLowerCase()] || { bg: '#f1f5f9', color: '#64748b' };
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
      {status || 'unknown'}
    </span>
  );
}

function SkeletonCard({ height = 160 }) {
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 8, padding: 20, height, animation: 'pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ height: 14, width: '60%', background: '#e2e8f0', borderRadius: 4, marginBottom: 10 }} />
      <div style={{ height: 24, width: '40%', background: '#e2e8f0', borderRadius: 4, marginBottom: 8 }} />
      <div style={{ height: 12, width: '30%', background: '#e2e8f0', borderRadius: 4 }} />
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div style={{
      background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8,
      padding: '16px 20px', color: '#dc2626', fontSize: 14,
    }}>
      <strong>Error:</strong> {message}
    </div>
  );
}

// ─── Section 1: Price Forecast Cards ────────────────────────────────────────

function SparkLine({ data }) {
  if (!data || data.length === 0) return <div style={{ height: 60 }} />;
  const prices = data.map((d) => ({ price: d.price }));
  return (
    <ResponsiveContainer width="100%" height={60}>
      <LineChart data={prices} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Line
          type="monotone"
          dataKey="price"
          stroke="#0d9488"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function PriceForecastSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = () =>
      axios.get('/api/price_forecast_all?city=All+cities')
        .then((r) => {
          const all = r.data.forecasts || [];
          const ok = all.filter((f) => f.success !== false && f.commodity);
          setData(ok.length > 0 ? ok : all);
          setLoading(false);
          setError(null);
        })
        .catch((e) => {
          if (e.response?.status === 503) {
            setError('building');
            setLoading(false);
            axios.post('/api/trigger_cache_build').catch(() => {});
            const poll = setInterval(() => {
              axios.get('/api/price_forecast_all?city=All+cities')
                .then((r) => {
                  const all = r.data.forecasts || [];
                  const ok = all.filter((f) => f.success !== false && f.commodity);
                  setData(ok.length > 0 ? ok : all);
                  setLoading(false); setError(null); clearInterval(poll);
                })
                .catch(() => {});
            }, 8000);
            setTimeout(() => clearInterval(poll), 300000);
          } else {
            setError(e.message); setLoading(false);
          }
        });
    load();
  }, []);

  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 16 }}>
        7-Day Price Forecast
      </h2>
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} height={180} />)}
        </div>
      )}
      {error === 'building' && (
        <div style={{ background: 'var(--warn-soft)', border: '1px solid oklch(0.7 0.14 80 / 0.3)', borderRadius: 8, padding: '20px 24px', color: 'var(--warn)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
          <div><strong>Building forecast data…</strong> This runs once and takes 1–2 minutes. The page will update automatically.</div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {error && error !== 'building' && <ErrorBox message={error} />}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {data.map((item) => {
            const changePct = item.price_change_pct;
            const isRising = changePct > 0;
            const isFalling = changePct < 0;
            return (
              <div key={item.commodity} style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
                    {item.commodity}
                  </span>
                  <TrendBadge badge={item.trend_badge} trend={item.overall_trend} />
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#0d9488', marginBottom: 4 }}>
                  {fmt(item.current_price)}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: isFalling ? '#16a34a' : isRising ? '#dc2626' : '#64748b' }}>
                  {isFalling ? '▼' : isRising ? '▲' : '—'} {pct(Math.abs(changePct))} 7-day change
                </div>
                <SparkLine data={item.forecasts} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Section 2: 6-Week Outlook ───────────────────────────────────────────────

const CustomTooltip6w = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]?.payload || {};
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Week {d.week} — {d.date}</div>
      <div>Forecast: <strong>{fmt(d.price)}</strong></div>
      <div>Historical Avg: <strong>{fmt(d.historical_avg)}</strong></div>
      <div>Confidence: <strong>{d.confidence != null ? `${(d.confidence * 100).toFixed(0)}%` : '—'}</strong></div>
      <div>Trend: <strong>{d.trend_pct != null ? `${Number(d.trend_pct).toFixed(1)}%` : '—'}</strong></div>
    </div>
  );
};

function LongTermSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axios.get('/api/price_forecast_long_term_all?city=All+cities')
      .then((r) => {
        const results = r.data.results || [];
        setData(results);
        if (results.length > 0) setSelected(results[0].commodity);
        setLoading(false);
      })
      .catch((e) => {
        if (e.response?.status === 503) {
          setError('building');
          axios.post('/api/trigger_cache_build').catch(() => {});
          const poll = setInterval(() => {
            axios.get('/api/price_forecast_long_term_all?city=All+cities')
              .then((r) => {
                const results = r.data.results || [];
                setData(results);
                if (results.length > 0) setSelected(results[0].commodity);
                setLoading(false); setError(null); clearInterval(poll);
              })
              .catch(() => {});
          }, 8000);
          setTimeout(() => clearInterval(poll), 300000);
        } else {
          setError(e.message); setLoading(false);
        }
      });
  }, []);

  const item = data?.find((d) => d.commodity === selected);
  const chartData = item?.forecasts?.map((f) => ({
    ...f,
    lower: f.lower,
    upper: f.upper,
    band: [f.lower, f.upper],
  })) || [];

  const lastForecast = item?.forecasts?.at(-1);

  return (
    <section style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
          6-Week Price Outlook
        </h2>
        {data && (
          <select
            value={selected || ''}
            onChange={(e) => setSelected(e.target.value)}
            style={{
              fontFamily: 'Inter, sans-serif', fontSize: 13, padding: '6px 12px',
              border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)',
              color: 'var(--color-text)', cursor: 'pointer',
            }}
          >
            {data.map((d) => (
              <option key={d.commodity} value={d.commodity}>{d.commodity}</option>
            ))}
          </select>
        )}
      </div>

      {loading && <SkeletonCard height={340} />}
      {error === 'building' && (
        <div style={{ background: 'var(--warn-soft)', border: '1px solid oklch(0.7 0.14 80 / 0.3)', borderRadius: 8, padding: '20px 24px', color: 'var(--warn)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
          <div><strong>Building forecast data…</strong> This runs once and takes 1–2 minutes. The page will update automatically.</div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {error && error !== 'building' && <ErrorBox message={error} />}

      {item && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {/* Summary row */}
          <div style={{ display: 'flex', gap: 32, marginBottom: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Current Price</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#0d9488' }}>{fmt(item.current_price)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>6-Week Projected</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)' }}>{fmt(lastForecast?.price)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>6-Week Change</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: item.price_change_pct > 0 ? '#dc2626' : '#16a34a' }}>
                {item.price_change_pct > 0 ? '▲' : item.price_change_pct < 0 ? '▼' : ''} {pct(Math.abs(item.price_change_pct))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Avg Confidence</div>
              <div style={{ marginTop: 4 }}><ConfidencePill value={item.avg_confidence || 0} /></div>
            </div>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'Inter, sans-serif' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tickFormatter={(v) => `$${v}`}
                tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'Inter, sans-serif' }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip content={<CustomTooltip6w />} />
              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="#ccfbf1"
                fillOpacity={0.6}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="#f8fafc"
                fillOpacity={1}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="historical_avg"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive={false}
                name="Historical Avg"
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#0d9488"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#0d9488', strokeWidth: 0 }}
                isAnimationActive={false}
                name="Forecast"
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Table */}
          <div style={{ overflowX: 'auto', marginTop: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  {['Week', 'Date', 'Forecast', 'Historical Avg', 'Confidence', 'Trend %'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(item.forecasts || []).map((f, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>W{f.week}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--color-text-muted)' }}>{f.date}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0d9488' }}>{fmt(f.price)}</td>
                    <td style={{ padding: '8px 12px' }}>{fmt(f.historical_avg)}</td>
                    <td style={{ padding: '8px 12px' }}><ConfidencePill value={f.confidence || 0} /></td>
                    <td style={{ padding: '8px 12px', color: f.trend_pct > 0 ? '#dc2626' : '#16a34a' }}>
                      {f.trend_pct != null ? `${f.trend_pct > 0 ? '▲' : '▼'} ${Math.abs(f.trend_pct).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Section 3: Live Weather ──────────────────────────────────────────────────

function WeatherSection() {
  const [data, setData] = useState(null);
  const [regions, setRegions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      axios.get('/api/live_weather'),
      axios.get('/api/growing_regions'),
    ])
      .then(([w, r]) => {
        setData(w.data.regions || []);
        setRegions(r.data.regions || []);
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const getCrops = (regionKey) => {
    const r = regions?.find((reg) => reg.key === regionKey);
    return r?.crops || [];
  };

  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 16 }}>
        Live Weather by Growing Region
      </h2>
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} height={180} />)}
        </div>
      )}
      {error && <ErrorBox message={error} />}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {data.map((region) => {
            const w = region.weather || {};
            const analysis = region.analysis || {};
            const crops = getCrops(region.key);
            const hasWeather = w.temp != null;
            const firstAlert = analysis.alerts?.[0];
            return (
              <div key={region.key} style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{region.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{region.city}</div>
                  </div>
                  <StatusBadge status={analysis.status} />
                </div>

                {hasWeather ? (
                  <>
                    <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>
                      {Math.round(w.temp)}°F
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 10, textTransform: 'capitalize' }}>
                      {w.weather_desc || w.weather_main || '—'}
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-muted)', marginBottom: firstAlert ? 10 : 0 }}>
                      <span>Humidity: <strong style={{ color: 'var(--color-text)' }}>{w.humidity}%</strong></span>
                      <span>Wind: <strong style={{ color: 'var(--color-text)' }}>{w.wind_speed} mph</strong></span>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>—</div>
                )}

                {firstAlert && (
                  <div style={{
                    fontSize: 11, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a',
                    borderRadius: 4, padding: '4px 8px', marginBottom: 10,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {firstAlert.message}
                  </div>
                )}

                {crops.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    {crops.slice(0, 4).map((crop) => (
                      <span key={crop} style={{
                        background: '#f0fdfa', color: '#0d9488', border: '1px solid #ccfbf1',
                        borderRadius: 999, fontSize: 10, fontWeight: 600, padding: '2px 7px',
                      }}>
                        {crop}
                      </span>
                    ))}
                    {crops.length > 4 && (
                      <span style={{ background: '#f1f5f9', color: '#64748b', borderRadius: 999, fontSize: 10, fontWeight: 600, padding: '2px 7px' }}>
                        +{crops.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Section 4: Growing Conditions Reference ─────────────────────────────────

function GrowingConditionsSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('/api/growing_conditions')
      .then((r) => { setData(r.data.conditions || {}); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const rows = data ? Object.entries(data) : [];

  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 16 }}>
        Growing Conditions Reference
      </h2>
      {loading && <SkeletonCard height={200} />}
      {error && <ErrorBox message={error} />}
      {data && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-2)', borderBottom: '2px solid var(--color-border)' }}>
                  {['Variety', 'Min Temp (°F)', 'Max Temp (°F)', 'Min Humidity (%)', 'Max Humidity (%)'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([variety, c], i) => (
                  <tr key={variety} style={{ background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text)' }}>{variety}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--color-text-muted)' }}>{c.temp_min ?? '—'}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--color-text-muted)' }}>{c.temp_max ?? '—'}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--color-text-muted)' }}>{c.humidity_min ?? '—'}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--color-text-muted)' }}>{c.humidity_max ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Header area with Refresh Data ───────────────────────────────────────────

function DashboardHeader() {
  const [refreshing, setRefreshing] = useState(false);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [pollTimer, setPollTimer] = useState(null);

  const stopPolling = useCallback(() => {
    setPollTimer((t) => { if (t) clearInterval(t); return null; });
  }, []);

  const pollStatus = useCallback(() => {
    axios.get('/api/cache_build_status')
      .then((r) => {
        const s = r.data;
        setCacheStatus(s);
        if (!s.running) {
          setRefreshing(false);
          stopPolling();
        }
      })
      .catch(() => {
        setRefreshing(false);
        stopPolling();
      });
  }, [stopPolling]);

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    axios.post('/api/trigger_cache_build')
      .then(() => {
        const t = setInterval(pollStatus, 5000);
        setPollTimer(t);
        pollStatus();
      })
      .catch((e) => {
        setRefreshing(false);
      });
  };

  useEffect(() => {
    axios.get('/api/cache_build_status')
      .then((r) => setCacheStatus(r.data))
      .catch(() => {});
    return () => stopPolling();
  }, [stopPolling]);

  const lastUpdated = cacheStatus?.cache_last_updated;

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      marginBottom: 32, flexWrap: 'wrap', gap: 12,
    }}>
      <div>
        <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--color-text)', margin: 0, marginBottom: 4 }}>
          Market Intelligence Dashboard
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
          Real-time prices, forecasts &amp; growing conditions
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
            background: refreshing ? '#f1f5f9' : '#0d9488',
            color: refreshing ? '#64748b' : '#ffffff',
            border: 'none', borderRadius: 7, padding: '9px 18px',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'background 0.15s ease',
          }}
        >
          {refreshing ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ animation: 'spin 0.8s linear infinite' }}>
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
              Refreshing...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M1 4v6h6M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
              </svg>
              Refresh Data
            </>
          )}
        </button>
        {lastUpdated && (
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </span>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewDashboard() {
  return (
    <>
      <DashboardHeader />
      <PriceForecastSection />
      <LongTermSection />
      <WeatherSection />
      <GrowingConditionsSection />
    </>
  );
}
