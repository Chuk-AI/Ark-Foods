import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  LineChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ComposedChart,
} from 'recharts';

// ─── constants ────────────────────────────────────────────────────────────────

const CITIES = [
  'All cities', 'Baltimore', 'Boston', 'Chicago', 'Columbia',
  'Miami', 'New York', 'Philadelphia', 'Los Angeles', 'Detroit', 'Atlanta',
];

const COMMODITIES = [
  'Jalapeno', 'Hungarian Wax', 'Shishito', 'Fresno', 'Long Hot',
  'Habanero', 'Anaheim', 'Cubanelle', 'Serrano', 'Poblano',
];

// ─── helpers ──────────────────────────────────────────────────────────────────

const money = (x) => (x == null || isNaN(+x) ? '—' : `$${(+x).toFixed(2)}`);
const pctFmt = (x) => (x == null || isNaN(+x) ? '—' : `${+x >= 0 ? '↑' : '↓'} ${Math.abs(+x).toFixed(1)}%`);

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
      <div style={{ width: 36, height: 36, border: '4px solid #e2e8f0', borderTop: '4px solid #059669', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function SectionTitle({ children, id }) {
  return (
    <h2 id={id} style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', borderBottom: '3px solid #059669', paddingBottom: 10, marginBottom: 20 }}>
      {children}
    </h2>
  );
}

function Badge({ children, type = 'info' }) {
  const colors = {
    success: { bg: '#d1fae5', color: '#065f46' },
    warning: { bg: '#fef3c7', color: '#92400e' },
    danger:  { bg: '#fee2e2', color: '#991b1b' },
    info:    { bg: '#dbeafe', color: '#1e40af' },
  };
  const c = colors[type] || colors.info;
  return (
    <span style={{ background: c.bg, color: c.color, padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
      {children}
    </span>
  );
}

function ConfBadge({ value }) {
  if (value == null) return <Badge type="danger">N/A</Badge>;
  const pct = (value * 100).toFixed(0);
  return value >= 0.75 ? <Badge type="success">{pct}%</Badge>
    : value >= 0.5 ? <Badge type="warning">{pct}%</Badge>
    : <Badge type="danger">{pct}%</Badge>;
}

function CitySelector({ value, onChange, label = 'City:' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ fontSize: 13, padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
        {CITIES.map((c) => <option key={c} value={c}>{c === 'All cities' ? 'All Cities' : c}</option>)}
      </select>
    </div>
  );
}

// ─── 1. Terminal Market Pricing Matrix ───────────────────────────────────────

function PricingMatrix() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    axios.get('/api/terminal_market_pricing?window_days=7')
      .then((r) => { setData(r.data.cities || {}); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const cityOrder = ['Baltimore', 'Boston', 'Chicago', 'Miami', 'New York', 'Philadelphia', 'Los Angeles', 'Detroit', 'Atlanta', 'Columbia'];
  const cities = data ? cityOrder.filter((c) => data[c]) : [];

  return (
    <div className="section" style={{ marginBottom: 40 }}>
      <SectionTitle>💰 Terminal Market Pricing Matrix</SectionTitle>
      {loading && <Spinner />}
      {error && <p style={{ color: '#dc2626' }}>Error: {error}</p>}
      {data && (
        <>
          <div style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 20, lineHeight: 1.7, color: '#475569', fontSize: 13 }}>
            <strong>Raw</strong> = price as reported by USDA/ProduceIQ in original package units ·
            <strong> $/bu</strong> = normalized to per-bushel (used in forecasting) ·
            <strong> FOB</strong> = best $/bu − 26% freight · <strong>Diff</strong> = ProduceIQ − USDA ($/bu)
          </div>
          {cities.map((city) => {
            const items = data[city]?.items || [];
            return (
              <div key={city} style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>📍 {city}</span>
                  <Badge type="success">ACTIVE</Badge>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Variety</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Package</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>PIQ Raw</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>USDA Raw</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>PIQ $/bu</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>USDA $/bu</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>Difference</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>FOB</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row, i) => {
                        const u = row.usda;
                        const p = row.produceiq;
                        const d = row.diff;
                        return (
                          <tr key={row.variety} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e293b' }}>{row.variety}</td>
                            {/* Package column — show PIQ package or USDA package */}
                            <td style={{ padding: '10px 12px', color: '#475569', fontSize: 11, maxWidth: 140 }}>
                              {(p?.package || u?.package)
                                ? <span title={p?.package || u?.package}>{p?.package || u?.package}</span>
                                : <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            {/* PIQ Raw: original price before conversion */}
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {p?.raw_price != null
                                ? <><div style={{ fontWeight: 700, color: '#92400e' }}>{money(p.raw_price)}</div><div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{p.raw_unit || p.unit}</div></>
                                : <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            {/* USDA Raw: original price before conversion */}
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {u?.raw_price != null
                                ? <><div style={{ fontWeight: 700, color: '#1e40af' }}>{money(u.raw_price)}</div><div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{u.raw_unit || u.unit}</div></>
                                : <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            {/* PIQ normalized $/bu */}
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {p
                                ? <><div style={{ fontWeight: 700, color: '#92400e' }}>{money(p.price)}</div><div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{p.unit}</div><div style={{ fontSize: 10, color: '#94a3b8' }}>{p.date}</div></>
                                : <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            {/* USDA normalized $/bu */}
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {u
                                ? <><div style={{ fontWeight: 700, color: '#1e40af' }}>{money(u.price)}</div><div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{u.unit}</div><div style={{ fontSize: 10, color: '#94a3b8' }}>{u.date}</div></>
                                : <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {d ? <><div style={{ fontWeight: 700, color: d.pct >= 0 ? '#dc2626' : '#16a34a' }}>{pctFmt(d.pct)}</div><div style={{ fontSize: 11, color: '#64748b' }}>{d.abs >= 0 ? '+' : ''}{money(d.abs)}</div></> : <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: '#16a34a', fontSize: 15 }}>{money(row.fob)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── 2. Highest Prices by Variety ─────────────────────────────────────────────

function HighestPrices() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('/api/terminal_market_pricing?window_days=7')
      .then((r) => {
        const cities = r.data.cities || {};
        const best = {};
        for (const [city, payload] of Object.entries(cities)) {
          for (const row of (payload.items || [])) {
            const price = (row.produceiq?.price ?? row.usda?.price) || 0;
            if (!best[row.variety] || price > best[row.variety].price) {
              best[row.variety] = { variety: row.variety, city, price, usda: row.usda, piq: row.produceiq, diff: row.diff, fob: row.fob };
            }
          }
        }
        setData(Object.values(best).sort((a, b) => b.price - a.price));
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  return (
    <div style={{ marginBottom: 40 }}>
      <SectionTitle>🏆 Highest Prices by Variety — Where to Sell</SectionTitle>
      {loading && <Spinner />}
      {error && <p style={{ color: '#dc2626' }}>Error: {error}</p>}
      {data && (
        <div style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff' }}>
                  {['Variety', 'Best Market', 'ProduceIQ', 'USDA', 'Diff', 'FOB Price'].map((h) => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: h === 'Variety' || h === 'Best Market' ? 'left' : 'center', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={r.variety} style={{ background: i < 3 ? '#fefce8' : i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{r.variety}</td>
                    <td style={{ padding: '12px 14px', color: '#059669', fontWeight: 600 }}>{r.city}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#92400e' }}>{r.piq ? money(r.piq.price) : '—'}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#1e40af' }}>{r.usda ? money(r.usda.price) : '—'}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{r.diff ? pctFmt(r.diff.pct) : '—'}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#16a34a', fontSize: 15 }}>{money(r.fob)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 3. 7-Day Price Forecast ──────────────────────────────────────────────────

function SparkLine({ data }) {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={50}>
      <LineChart data={data.map((d) => ({ v: d.price }))} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line type="monotone" dataKey="v" stroke="#059669" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function PriceForecast7Day({ city }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true); setData(null); setError(null);
    axios.get(`/api/price_forecast_all?city=${encodeURIComponent(city)}`)
      .then((r) => {
        const all = r.data.forecasts || [];
        const ok = all.filter((f) => f.success !== false && f.commodity);
        setData(ok.length ? ok : all);
        setLoading(false);
      })
      .catch((e) => {
        if (e.response?.status === 503) {
          setError('building'); setLoading(false);
          axios.post('/api/trigger_cache_build').catch(() => {});
          const poll = setInterval(() => {
            axios.get(`/api/price_forecast_all?city=${encodeURIComponent(city)}`)
              .then((r) => {
                const ok = (r.data.forecasts || []).filter((f) => f.success !== false && f.commodity);
                setData(ok); setLoading(false); setError(null); clearInterval(poll);
              }).catch(() => {});
          }, 8000);
          setTimeout(() => clearInterval(poll), 600000);
        } else { setError(e.message); setLoading(false); }
      });
  }, [city]);

  const trendIcon = (t) => t === 'RISING' ? '📈' : t === 'FALLING' ? '📉' : '➡️';
  const trendColor = (t) => t === 'RISING' ? '#dc2626' : t === 'FALLING' ? '#22c55e' : '#64748b';

  return (
    <div style={{ marginBottom: 40 }}>
      <SectionTitle>📈 7-Day Price Forecast</SectionTitle>
      {loading && <Spinner />}
      {error === 'building' && (
        <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, padding: '18px 22px', color: '#854d0e', fontSize: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 18, height: 18, border: '3px solid #fde68a', borderTop: '3px solid #854d0e', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          <div><strong>Building forecast cache…</strong> This takes 5–15 minutes. Will update automatically.</div>
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      {error && error !== 'building' && <p style={{ color: '#dc2626' }}>Error: {error}</p>}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 18 }}>
          {data.map((f) => (
            <div key={f.commodity} style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12, padding: 20, transition: 'all .2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(59,130,246,.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{f.commodity}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>{trendIcon(f.overall_trend)}</span>
                  <Badge type={f.trend_badge || 'info'}>{f.overall_trend}</Badge>
                </span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#059669', marginBottom: 4 }}>{money(f.current_price)}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginBottom: 12 }}>
                <div><span style={{ color: '#64748b' }}>Momentum: </span><strong style={{ color: f.momentum_pct >= 0 ? '#dc2626' : '#22c55e' }}>{f.momentum_pct >= 0 ? '+' : ''}{f.momentum_pct?.toFixed(1)}%</strong></div>
                <div><span style={{ color: '#64748b' }}>Volatility: </span><strong>±{money(f.std_dev)}</strong></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 8 }}>
                {(f.forecasts || []).map((d, i) => (
                  <div key={i} style={{ textAlign: 'center', background: '#f8fafc', borderRadius: 6, padding: '6px 2px', fontSize: 10 }}>
                    <div style={{ fontWeight: 600, color: '#64748b' }}>{d.day_name?.slice(0, 3)}</div>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 11 }}>${d.price?.toFixed(0)}</div>
                    <div style={{ color: d.trend === 'up' ? '#dc2626' : d.trend === 'down' ? '#22c55e' : '#64748b' }}>
                      {d.trend === 'up' ? '↑' : d.trend === 'down' ? '↓' : '→'}
                    </div>
                  </div>
                ))}
              </div>
              <SparkLine data={f.forecasts} />
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                7-day change: <strong style={{ color: trendColor(f.overall_trend) }}>{f.price_change_pct >= 0 ? '+' : ''}{f.price_change_pct?.toFixed(1)}%</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 4. 6-Week Hybrid Market Outlook ─────────────────────────────────────────

const Tooltip6w = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload || {};
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Week {d.week} — {d.date}</div>
      <div>Forecast: <strong>{money(d.price)}</strong> ±{money(d.tolerance)}</div>
      <div>Historical Avg: <strong>{money(d.historical_avg)}</strong></div>
      <div>Confidence: <strong>{d.confidence != null ? `${(d.confidence * 100).toFixed(0)}%` : '—'}</strong></div>
      {d.trend_pct != null && <div>Trend: <strong style={{ color: d.trend_pct >= 0 ? '#dc2626' : '#22c55e' }}>{d.trend_pct >= 0 ? '+' : ''}{d.trend_pct.toFixed(1)}%</strong></div>}
    </div>
  );
};

function LongTermCard({ commodity, city }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true); setData(null);
    axios.get(`/api/price_forecast_long_term?commodity=${encodeURIComponent(commodity)}&city=${encodeURIComponent(city)}`)
      .then((r) => { setData(r.data); setLoading(false); })
      .catch(() => { setData({ success: false, error: 'Failed to load' }); setLoading(false); });
  }, [commodity, city]);

  if (loading) return (
    <div style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
      <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTop: '3px solid #059669', borderRadius: '50%', animation: 'spin2 1s linear infinite' }} />
      <style>{`@keyframes spin2{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!data?.success) return (
    <div style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>🔮 {commodity}</div>
      <p style={{ color: '#dc2626', fontSize: 13 }}>{data?.error || 'No current price data available'}</p>
    </div>
  );

  const avgVariance = data.avg_variance_from_historical_pct;
  const chartData = (data.forecasts || []).map((f) => ({ ...f }));

  return (
    <div style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>🔮 {data.commodity}</span>
        {avgVariance != null && (
          <Badge type={avgVariance > 20 ? 'danger' : avgVariance > 0 ? 'warning' : 'success'}>
            {avgVariance > 0 ? '↑' : avgVariance < 0 ? '↓' : '='} {Math.abs(avgVariance).toFixed(0)}% vs Hist
          </Badge>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: '#64748b' }}>Current Price</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#059669' }}>{money(data.current_price)}</div>
      </div>

      {/* Mini chart */}
      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={120}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip content={<Tooltip6w />} />
            <Area type="monotone" dataKey="upper" stroke="none" fill="#ccfbf1" fillOpacity={0.4} isAnimationActive={false} />
            <Area type="monotone" dataKey="lower" stroke="none" fill="#fff" fillOpacity={1} isAnimationActive={false} />
            <Line type="monotone" dataKey="historical_avg" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="price" stroke="#059669" strokeWidth={2} dot={{ r: 3, fill: '#059669' }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* Week rows */}
      <div style={{ marginTop: 12 }}>
        {(data.forecasts || []).map((w) => (
          <div key={w.week} style={{ padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 700, color: '#64748b', fontSize: 13 }}>Week {w.week}</span>
                <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 8 }}>{w.date}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 800, color: '#059669', fontSize: 14 }}>{money(w.price)}</span>
                <span style={{ color: '#94a3b8', fontSize: 11 }}> ±{money(w.tolerance)}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, fontSize: 11, color: '#64748b', marginTop: 4 }}>
              {w.trend_pct != null && <div>Trend: <strong style={{ color: w.trend_pct >= 0 ? '#dc2626' : '#22c55e' }}>{w.trend_pct >= 0 ? '+' : ''}{w.trend_pct.toFixed(1)}%</strong></div>}
              {w.historical_avg != null && <div>Hist: <strong>{money(w.historical_avg)}</strong></div>}
              {w.variance_from_historical_pct != null && <div>vs Hist: <strong style={{ color: w.variance_from_historical_pct > 0 ? '#dc2626' : '#22c55e' }}>{w.variance_from_historical_pct > 0 ? '+' : ''}{w.variance_from_historical_pct.toFixed(0)}%</strong></div>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '2px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
        <div><span style={{ color: '#64748b' }}>Avg Confidence: </span><strong style={{ color: '#059669' }}>{data.avg_confidence ? `${(data.avg_confidence * 100).toFixed(0)}%` : '—'}</strong></div>
        <div><span style={{ color: '#64748b' }}>Volatility: </span><strong>±{money(data.volatility)}</strong></div>
      </div>
      {data.method && <div style={{ marginTop: 8, background: '#f1f5f9', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#475569' }}>{data.method}</div>}
    </div>
  );
}

function LongTermOutlook({ city }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <SectionTitle>🔮 6-Week Hybrid Market Outlook</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(380px,1fr))', gap: 18 }}>
        {COMMODITIES.map((c) => <LongTermCard key={c} commodity={c} city={city} />)}
      </div>
    </div>
  );
}

// ─── 5. Seasonal Price Projections ───────────────────────────────────────────

function SeasonalForecast({ city }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true); setData(null); setError(null);
    const params = `commodities=${COMMODITIES.join(',')}&city=${encodeURIComponent(city)}&forecastYears=1&source=ProduceIQ`;
    axios.get(`/api/forecast_line_data?${params}`)
      .then((r) => { setData(r.data); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [city]);

  return (
    <div style={{ marginBottom: 40 }}>
      <SectionTitle>🔮 Seasonal Price Projections</SectionTitle>
      {loading && <Spinner />}
      {error && <p style={{ color: '#dc2626' }}>Error: {error}</p>}
      {data?.labels && (
        <div style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12, padding: 20, overflowX: 'auto' }}>
          {city !== 'All cities' && <div style={{ color: '#64748b', fontSize: 13, marginBottom: 10 }}>📍 Showing seasonal forecast for <strong>{city}</strong></div>}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', padding: '10px 12px', textAlign: 'left', fontWeight: 600, minWidth: 120 }}>Commodity</th>
                {data.labels.map((l) => (
                  <th key={l} style={{ background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', padding: '10px 8px', textAlign: 'center', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 11 }}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.datasets || []).map((ds, i) => (
                <tr key={ds.label} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1e293b' }}>{ds.label}</td>
                  {(ds.data || []).map((price, j) => (
                    <td key={j} style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 600, color: price > 0 ? '#059669' : '#94a3b8' }}>
                      {price > 0 ? `$${price.toFixed(2)}` : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── 6. Regional Weather & Growing Conditions ────────────────────────────────

const WEATHER_EMOJI = { '01': '☀️', '02': '⛅', '03': '☁️', '04': '☁️', '09': '🌧️', '10': '🌦️', '11': '⛈️', '13': '❄️', '50': '🌫️' };
const weatherEmoji = (icon) => { if (!icon) return '🌡️'; const c = icon.replace('d', '').replace('n', '').padStart(2, '0'); return WEATHER_EMOJI[c] || '🌡️'; };

const STATUS_COLORS = {
  optimal:  { bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '#22c55e' },
  warning:  { bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '#f59e0b' },
  critical: { bg: 'linear-gradient(135deg,#fef2f2,#fee2e2)', border: '#ef4444' },
  caution:  { bg: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '#f97316' },
};

function WeatherCards() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('/api/live_weather')
      .then((r) => { setData(r.data.regions || []); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const allFailed = data?.every((r) => !r.weather?.temp);

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '3px solid #059669', paddingBottom: 10, marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>☁️ Regional Weather &amp; Growing Conditions</h2>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#22c55e', fontWeight: 700 }}>
          <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%', animation: 'pulse2 1.5s infinite' }} />
          LIVE
          <style>{`@keyframes pulse2{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
        </span>
      </div>
      {allFailed && (
        <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#92400e', marginBottom: 16 }}>
          ⚠️ Live weather requires <code>OPENWEATHER_API_KEY</code> in environment. Set it in <code>.env</code> and restart gunicorn.
        </div>
      )}
      {loading && <Spinner />}
      {error && <p style={{ color: '#dc2626' }}>Error: {error}</p>}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 18 }}>
          {data.map((region) => {
            const w = region.weather || {};
            const a = region.analysis || {};
            const sc = STATUS_COLORS[(a.status || 'optimal').toLowerCase()] || STATUS_COLORS.optimal;
            const hasWeather = w.temp != null;
            return (
              <div key={region.key} style={{ background: sc.bg, borderLeft: `4px solid ${sc.border}`, borderRadius: 12, padding: 20, ...(a.status === 'critical' ? { animation: 'palert 2s infinite' } : {}) }}>
                <style>{`@keyframes palert{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.4)}50%{box-shadow:0 0 0 10px rgba(239,68,68,0)}}`}</style>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{region.name}</div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>{region.city}</div>
                  </div>
                  {hasWeather && <img src={`https://openweathermap.org/img/wn/${w.weather_icon}@2x.png`} alt={w.weather_desc} style={{ width: 52, height: 52 }} />}
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
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#94a3b8', margin: '10px 0' }}>—</div>
                )}
                {(a.alerts || []).slice(0, 2).map((alert, i) => (
                  <div key={i} style={{ background: alert.type === 'critical' ? '#fee2e2' : '#fef3c7', borderLeft: `4px solid ${alert.type === 'critical' ? '#dc2626' : '#f59e0b'}`, padding: '8px 10px', borderRadius: 6, fontSize: 11, marginBottom: 4 }}>
                    {alert.icon} {alert.message}
                  </div>
                ))}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
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

// ─── 7. 7-Day Weather Forecast ────────────────────────────────────────────────

function WeatherForecast7Day() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('/api/weather_forecast_7day')
      .then((r) => { setData(r.data.regions || []); setLoading(false); })
      .catch((e) => {
        if (e.response?.status === 503) {
          setError('Cache not ready. Rebuild cache to enable 7-day weather forecast.');
        } else {
          setError(e.message);
        }
        setLoading(false);
      });
  }, []);

  const growingColor = (s) => s === 'optimal' ? '#22c55e' : s === 'warning' ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ marginBottom: 40 }}>
      <SectionTitle>🌤️ 7-Day Weather Forecast</SectionTitle>
      {loading && <Spinner />}
      {error && <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#92400e' }}>ℹ️ {error}</div>}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 18 }}>
          {data.map((region) => {
            const f = region.forecast;
            if (!f?.success) return (
              <div key={region.key} style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{region.name}</div>
                <p style={{ color: '#dc2626', fontSize: 13 }}>Forecast unavailable</p>
              </div>
            );
            return (
              <div key={region.key} style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{region.name}</div>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{f.city}, {f.country}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                  {(f.forecasts || []).slice(0, 7).map((day, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '8px 4px', background: '#f8fafc', borderRadius: 8, borderBottom: `3px solid ${growingColor(day.growing_status)}` }}>
                      <div style={{ fontWeight: 600, color: '#64748b', fontSize: 10 }}>{day.day_name?.slice(0, 3)}</div>
                      <img src={`https://openweathermap.org/img/wn/${day.icon}.png`} alt={day.condition} style={{ width: 32 }} />
                      <div style={{ fontWeight: 700, fontSize: 12 }}>{Math.round(day.temp_high)}°</div>
                      <div style={{ color: '#94a3b8', fontSize: 10 }}>{Math.round(day.temp_low)}°</div>
                      <div style={{ fontSize: 9, color: '#64748b' }}>💧{day.humidity}%</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 12 }}>
                  {(region.crops || []).map((crop) => <span key={crop} style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600 }}>{crop}</span>)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 8. Growing Conditions Reference ─────────────────────────────────────────

function GrowingConditions() {
  const [data, setData] = useState(null);
  useEffect(() => { axios.get('/api/growing_conditions').then((r) => setData(r.data.conditions || {})).catch(() => {}); }, []);
  if (!data) return null;
  return (
    <div style={{ marginBottom: 40 }}>
      <SectionTitle>🌱 Growing Conditions Reference</SectionTitle>
      <div style={{ background: '#fff', border: '2px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff' }}>
                {['Variety', 'Min Temp (°F)', 'Max Temp (°F)', 'Min Humidity (%)', 'Max Humidity (%)'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(data).map(([v, c], i) => (
                <tr key={v} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>{v}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{c.temp_min ?? '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{c.temp_max ?? '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{c.humidity_min ?? '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{c.humidity_max ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function NewDashboard() {
  const [city7Day, setCity7Day] = useState('All cities');
  const [city6Week, setCity6Week] = useState('All cities');
  const [citySeasonal, setCitySeasonal] = useState('All cities');

  return (
    <div style={{ padding: '28px 20px', maxWidth: 1600, margin: '0 auto', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '3px solid #059669', paddingBottom: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>📈 7-Day Price Forecast</h2>
        <CitySelector value={city7Day} onChange={setCity7Day} />
      </div>
      <PriceForecast7Day city={city7Day} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '3px solid #059669', paddingBottom: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>🔮 6-Week Hybrid Market Outlook</h2>
        <CitySelector value={city6Week} onChange={setCity6Week} />
      </div>
      <LongTermOutlook city={city6Week} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '3px solid #059669', paddingBottom: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>📊 Seasonal Price Projections</h2>
        <CitySelector value={citySeasonal} onChange={setCitySeasonal} />
      </div>
      <SeasonalForecast city={citySeasonal} />

      <WeatherCards />
      <WeatherForecast7Day />
      <GrowingConditions />
    </div>
  );
}
