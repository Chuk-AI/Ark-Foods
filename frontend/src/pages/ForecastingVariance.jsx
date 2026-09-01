import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const fmt = (v, dec = 2) => (v == null ? '—' : `$${(+v).toFixed(dec)}`);
const pct = (v) => (v == null ? '—' : `${(+v).toFixed(1)}%`);

function MetricCard({ label, value, sub, color }) {
  const c = color || 'var(--accent)';
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '16px 20px',
      flex: 1,
      minWidth: 130,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: c, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 48 }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Fan chart drawn on canvas ──────────────────────────────────────────────
function FanChart({ data, horizonWeeks }) {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth;
    const H = 300;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    // Detect theme
    const style = getComputedStyle(document.documentElement);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
      || (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const gridCol  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const textCol  = isDark ? '#6b8a6b' : '#7a9a7a';
    const histCol  = isDark ? '#a0b8a0' : '#4a6a4a';
    const foreCol  = isDark ? '#52c27a' : '#2A6349';
    const actCol   = isDark ? '#f59e0b' : '#b45309';
    const divCol   = isDark ? 'rgba(245,158,11,0.5)' : 'rgba(180,83,9,0.45)';

    const { history, forecast } = data;
    const allPoints = [...history, ...forecast.map(f => f.median)];
    const allActuals = forecast.filter(f => f.actual != null).map(f => f.actual);
    const allHi95 = forecast.map(f => f.ci_95_hi);
    const allLo95 = forecast.map(f => f.ci_95_lo);
    const allVals = [...allPoints, ...allActuals, ...allHi95, ...allLo95].filter(v => v != null);

    const pad = { top: 18, right: 16, bottom: 36, left: 52 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;

    const minV = Math.min(...allVals) * 0.97;
    const maxV = Math.max(...allVals) * 1.03;

    const totalPts = history.length + forecast.length;
    const xOf = (i) => pad.left + (i / (totalPts - 1)) * cw;
    const yOf = (v) => pad.top + ch - ((v - minV) / (maxV - minV)) * ch;

    // Grid
    ctx.strokeStyle = gridCol;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (ch / 5) * i;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke();
    }

    // Y labels
    ctx.fillStyle = textCol;
    ctx.font = `10px DM Sans, system-ui, sans-serif`;
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const v = minV + ((maxV - minV) / 5) * (5 - i);
      ctx.fillText('$' + v.toFixed(0), pad.left - 6, pad.top + (ch / 5) * i + 4);
    }

    const divIdx = history.length - 1;
    const divX = xOf(divIdx);

    // --- Confidence bands (forecast region) ---
    const band = (loVals, hiVals, color) => {
      ctx.beginPath();
      for (let i = 0; i < hiVals.length; i++) {
        const xi = xOf(i + divIdx);
        const yi = yOf(hiVals[i]);
        i === 0 ? ctx.moveTo(xi, yi) : ctx.lineTo(xi, yi);
      }
      for (let i = hiVals.length - 1; i >= 0; i--) {
        ctx.lineTo(xOf(i + divIdx), yOf(loVals[i]));
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };

    band(forecast.map(f => f.ci_95_lo), forecast.map(f => f.ci_95_hi),
      isDark ? 'rgba(82,194,122,0.10)' : 'rgba(42,99,73,0.09)');
    band(forecast.map(f => f.ci_80_lo), forecast.map(f => f.ci_80_hi),
      isDark ? 'rgba(82,194,122,0.18)' : 'rgba(42,99,73,0.15)');
    band(forecast.map(f => f.ci_50_lo), forecast.map(f => f.ci_50_hi),
      isDark ? 'rgba(82,194,122,0.30)' : 'rgba(42,99,73,0.25)');

    // Divider
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = divCol;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(divX, pad.top - 4); ctx.lineTo(divX, pad.top + ch + 4); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = divCol;
    ctx.font = '9px DM Sans, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('FORECAST →', divX + 5, pad.top + 11);
    ctx.textAlign = 'right';
    ctx.fillText('← HISTORY', divX - 5, pad.top + 11);

    // Forecast median (dashed)
    ctx.strokeStyle = foreCol;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    forecast.forEach((f, i) => {
      const xi = xOf(i + divIdx);
      const yi = yOf(f.median);
      i === 0 ? ctx.moveTo(xi, yi) : ctx.lineTo(xi, yi);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Historical line
    ctx.strokeStyle = histCol;
    ctx.lineWidth = 2;
    ctx.beginPath();
    history.forEach((h, i) => {
      const xi = xOf(i);
      const yi = yOf(h.price);
      i === 0 ? ctx.moveTo(xi, yi) : ctx.lineTo(xi, yi);
    });
    ctx.stroke();

    // Actuals line (post as_of)
    const actualPts = forecast.filter(f => f.actual != null);
    if (actualPts.length > 0) {
      ctx.strokeStyle = actCol;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      // connect from last history point
      const lastHistIdx = divIdx;
      const lastHistPrice = history[history.length - 1]?.price;
      if (lastHistPrice) ctx.moveTo(xOf(lastHistIdx), yOf(lastHistPrice));
      actualPts.forEach((f) => {
        const xi = xOf((f.week - 1) + divIdx);
        const yi = yOf(f.actual);
        lastHistPrice ? ctx.lineTo(xi, yi) : ctx.moveTo(xi, yi);
      });
      ctx.stroke();

      // Actual dots
      ctx.fillStyle = actCol;
      actualPts.forEach((f) => {
        ctx.beginPath();
        ctx.arc(xOf((f.week - 1) + divIdx), yOf(f.actual), 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Forecast median dots
    ctx.fillStyle = foreCol;
    forecast.forEach((f, i) => {
      ctx.beginPath();
      ctx.arc(xOf(i + divIdx), yOf(f.median), 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // X axis labels (every other week)
    ctx.fillStyle = textCol;
    ctx.font = '9px DM Sans, system-ui, sans-serif';
    ctx.textAlign = 'center';
    history.forEach((h, i) => {
      if (i % 2 === 0) ctx.fillText(`−${history.length - 1 - i}w`, xOf(i), pad.top + ch + 20);
    });
    forecast.forEach((f, i) => {
      if (i % 2 === 0) ctx.fillText(`+${i + 1}w`, xOf(i + divIdx), pad.top + ch + 20);
    });

    // Legend
    const legendItems = [
      { color: histCol, dash: false, label: 'Actual (history)' },
      { color: foreCol, dash: true, label: 'Forecast median' },
      { color: actCol, dash: false, label: 'Actual (post-forecast)' },
    ];
    let lx = pad.left + 8;
    legendItems.forEach(({ color, dash, label }) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      if (dash) ctx.setLineDash([4, 3]); else ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(lx, H - 10); ctx.lineTo(lx + 18, H - 10);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = textCol;
      ctx.textAlign = 'left';
      ctx.font = '9px DM Sans, system-ui, sans-serif';
      ctx.fillText(label, lx + 22, H - 7);
      lx += 110;
    });
  }, [data]);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    const mo = new MutationObserver(draw);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: 300 }}
    />
  );
}

// ── Error table ────────────────────────────────────────────────────────────
function ErrorTable({ forecast }) {
  const weeks = forecast.filter(f => f.actual != null);
  if (!weeks.length) return <p style={{ color: 'var(--text-3)', fontSize: 13, padding: '16px 0' }}>No actuals available yet for comparison.</p>;

  const maxErr = Math.max(...weeks.map(w => Math.abs(w.error || 0)));

  const errColor = (pctErr) => {
    if (pctErr == null) return 'var(--text-3)';
    if (pctErr <= 5) return '#15803d';
    if (pctErr <= 10) return '#b45309';
    return '#dc2626';
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)' }}>
            {['Week', 'Date', 'Forecast', 'Actual', 'Error', '% Error', 'Error bar', '50%', '80%', '95%'].map(h => (
              <th key={h} style={{
                padding: '9px 12px', textAlign: ['Forecast', 'Actual', 'Error', '% Error', '50%', '80%', '95%'].includes(h) ? 'center' : 'left',
                fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase',
                letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((f, i) => {
            const barW = maxErr > 0 ? Math.abs(f.error || 0) / maxErr * 100 : 0;
            const barColor = (f.error || 0) > 0 ? '#b45309' : '#2A6349';
            return (
              <tr key={f.week} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)' }}>
                <td style={{ padding: '9px 12px', color: 'var(--text-3)', fontWeight: 600 }}>+{f.week}w</td>
                <td style={{ padding: '9px 12px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{f.week_label}</td>
                <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(f.median)}</td>
                <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: '#b45309', fontVariantNumeric: 'tabular-nums' }}>{fmt(f.actual)}</td>
                <td style={{ padding: '9px 12px', textAlign: 'center', color: (f.error || 0) > 0 ? '#dc2626' : '#15803d', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {f.error != null ? `${f.error > 0 ? '+' : ''}${f.error.toFixed(2)}` : '—'}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: errColor(f.error_pct) }}>
                  {pct(f.error_pct)}
                </td>
                <td style={{ padding: '9px 12px', minWidth: 80 }}>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barW}%`, background: barColor, borderRadius: 3 }} />
                  </div>
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                  {f.in_ci_50 === true ? <span style={{ color: '#15803d', fontSize: 14 }}>✓</span> : <span style={{ color: '#dc2626', fontSize: 12 }}>✗</span>}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                  {f.in_ci_80 === true ? <span style={{ color: '#15803d', fontSize: 14 }}>✓</span> : <span style={{ color: '#dc2626', fontSize: 12 }}>✗</span>}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                  {f.in_ci_95 === true ? <span style={{ color: '#15803d', fontSize: 14 }}>✓</span> : <span style={{ color: '#dc2626', fontSize: 12 }}>✗</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Component breakdown bar chart ─────────────────────────────────────────
function ComponentChart({ forecast }) {
  const maxAbs = Math.max(...forecast.map(f => Math.max(Math.abs(f.seasonal_component), Math.abs(f.trend_component))), 1);
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {['Week', 'Seasonal base', '', 'Trend adj', '', 'Forecast'].map((h, i) => (
              <th key={i} style={{ padding: '8px 10px', textAlign: i === 0 || i === 5 ? 'left' : 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {forecast.map((f, i) => (
            <tr key={f.week} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)' }}>
              <td style={{ padding: '7px 10px', color: 'var(--text-3)', fontWeight: 600 }}>+{f.week}w</td>
              <td style={{ padding: '7px 10px', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(f.seasonal_component)}</td>
              <td style={{ padding: '7px 10px', width: 100 }}>
                <div style={{ height: 5, background: 'var(--border)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${Math.abs(f.seasonal_component) / maxAbs * 100}%`, background: '#4a6a4a', borderRadius: 3 }} />
                </div>
              </td>
              <td style={{ padding: '7px 10px', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: f.trend_component >= 0 ? '#dc2626' : '#15803d' }}>
                {f.trend_component > 0 ? '+' : ''}{f.trend_component.toFixed(2)}
              </td>
              <td style={{ padding: '7px 10px', width: 100 }}>
                <div style={{ height: 5, background: 'var(--border)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${Math.abs(f.trend_component) / maxAbs * 100}%`, background: f.trend_component >= 0 ? '#dc2626' : '#15803d', borderRadius: 3 }} />
                </div>
              </td>
              <td style={{ padding: '7px 10px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(f.median)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ForecastingVariance() {
  const [commodities, setCommodities] = useState([]);
  const [cities, setCities] = useState([]);
  const [commodity, setCommodity] = useState('Bell Peppers');
  const [city, setCity] = useState('New York');
  const [horizonWeeks, setHorizonWeeks] = useState(12);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('error-table');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    axios.get('/api/forecast_hindcast', { params: { commodity, city, horizon_weeks: horizonWeeks } })
      .then(r => {
        if (r.data.error) {
          setError(r.data.error);
          if (r.data.commodities) setCommodities(r.data.commodities);
          if (r.data.cities) setCities(r.data.cities);
        } else {
          setData(r.data);
          if (r.data.commodities?.length) setCommodities(r.data.commodities);
          if (r.data.cities?.length) setCities(r.data.cities);
        }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [commodity, city, horizonWeeks]);

  useEffect(() => { load(); }, []);

  const m = data?.metrics;
  const mapeColor = m?.mape == null ? 'var(--text-2)' : m.mape <= 5 ? '#15803d' : m.mape <= 12 ? '#b45309' : '#dc2626';
  const dirColor  = m?.directional_accuracy == null ? 'var(--text-2)' : m.directional_accuracy >= 70 ? '#15803d' : m.directional_accuracy >= 55 ? '#b45309' : '#dc2626';

  const tabStyle = (key) => ({
    padding: '8px 16px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    background: activeTab === key ? 'var(--surface)' : 'transparent',
    color: activeTab === key ? 'var(--text)' : 'var(--text-3)',
    borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent',
    transition: 'color 0.15s',
  });

  return (
    <div style={{ padding: '24px 24px 60px', maxWidth: 1300, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          Forecasting Variance
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
          Hindcast — simulate a forecast made <strong>{horizonWeeks} weeks ago</strong>, then compare against what actually happened.
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Commodity</label>
          <select value={commodity} onChange={e => setCommodity(e.target.value)}
            style={{ fontSize: 13, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)', minWidth: 160 }}>
            {commodities.length ? commodities.map(c => <option key={c}>{c}</option>) : <option>{commodity}</option>}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>City</label>
          <select value={city} onChange={e => setCity(e.target.value)}
            style={{ fontSize: 13, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)', minWidth: 140 }}>
            {cities.length ? cities.map(c => <option key={c}>{c}</option>) : <option>{city}</option>}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Horizon</label>
          <select value={horizonWeeks} onChange={e => setHorizonWeeks(+e.target.value)}
            style={{ fontSize: 13, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)' }}>
            <option value={8}>8 weeks</option>
            <option value={12}>12 weeks</option>
            <option value={16}>16 weeks</option>
            <option value={20}>20 weeks</option>
          </select>
        </div>
        <button onClick={load} disabled={loading}
          style={{ padding: '8px 20px', fontSize: 12, fontWeight: 700, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', alignSelf: 'flex-end', opacity: loading ? 0.6 : 1 }}>
          Run Hindcast
        </button>
        {data && (
          <div style={{ alignSelf: 'flex-end', fontSize: 12, color: 'var(--text-3)', marginLeft: 4 }}>
            As-of {data.as_of_date} · σ = {fmt(data.sigma)} · slope = {data.slope > 0 ? '+' : ''}{data.slope.toFixed(2)}/wk
          </div>
        )}
      </div>

      {loading && <Spinner />}
      {error && <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#991b1b', fontSize: 13 }}>{error}</div>}

      {!loading && data && (
        <>
          {/* Metric cards */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <MetricCard
              label="MAPE"
              value={m?.mape != null ? `${m.mape}%` : '—'}
              sub="Mean Absolute % Error"
              color={mapeColor}
            />
            <MetricCard
              label="MAE"
              value={m?.mae != null ? fmt(m.mae) : '—'}
              sub="Mean Absolute Error $/bu"
              color="var(--text-2)"
            />
            <MetricCard
              label="RMSE"
              value={m?.rmse != null ? fmt(m.rmse) : '—'}
              sub="Root Mean Sq. Error"
              color="var(--text-2)"
            />
            <MetricCard
              label="Directional"
              value={m?.directional_accuracy != null ? `${m.directional_accuracy}%` : '—'}
              sub="Up/down calls correct"
              color={dirColor}
            />
            <MetricCard
              label="50% CI Hit"
              value={pct(m?.ci_50_coverage)}
              sub={`ideal ≥ 50% (${m?.weeks_with_actuals ?? 0} wks)`}
              color={m?.ci_50_coverage >= 45 ? '#15803d' : '#b45309'}
            />
            <MetricCard
              label="80% CI Hit"
              value={pct(m?.ci_80_coverage)}
              sub="ideal ≥ 80%"
              color={m?.ci_80_coverage >= 75 ? '#15803d' : '#b45309'}
            />
            <MetricCard
              label="95% CI Hit"
              value={pct(m?.ci_95_coverage)}
              sub="ideal ≥ 95%"
              color={m?.ci_95_coverage >= 90 ? '#15803d' : '#b45309'}
            />
          </div>

          {/* Fan chart */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '12px 18px 10px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  {data.commodity} · {data.city}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                  Historical prices → forecast from {data.as_of_date} → actuals (amber)
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: 'rgba(42,99,73,0.12)', color: 'var(--accent)' }}>95% band</span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: 'rgba(42,99,73,0.22)', color: 'var(--accent)' }}>80% band</span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: 'rgba(42,99,73,0.35)', color: 'var(--accent)' }}>50% band</span>
              </div>
            </div>
            <div style={{ padding: '8px 8px 4px' }}>
              <FanChart data={data} horizonWeeks={horizonWeeks} />
            </div>
          </div>

          {/* Tabs */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', padding: '0 8px' }}>
              {[
                { key: 'error-table', label: 'Week-by-Week Errors' },
                { key: 'components', label: 'Component Breakdown' },
              ].map(t => (
                <button key={t.key} style={tabStyle(t.key)} onClick={() => setActiveTab(t.key)}>{t.label}</button>
              ))}
            </div>
            <div style={{ padding: 0 }}>
              {activeTab === 'error-table' && <ErrorTable forecast={data.forecast} />}
              {activeTab === 'components' && <ComponentChart forecast={data.forecast} />}
            </div>
          </div>

          {/* Interpretation notes */}
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Reading MAPE</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
                <span style={{ color: '#15803d', fontWeight: 700 }}>≤ 5%</span> · Excellent<br />
                <span style={{ color: '#b45309', fontWeight: 700 }}>5–12%</span> · Acceptable for ag markets<br />
                <span style={{ color: '#dc2626', fontWeight: 700 }}>&gt; 12%</span> · Model needs improvement
              </div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Reading CI Coverage</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
                A well-calibrated model has actuals inside the 80% band ~80% of the time. If coverage is much lower, the bands are too narrow (overconfident). Much higher = too wide (uninformative).
              </div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Current model</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
                Seasonal baseline + linear trend with 8-week decay. Adding weather signals and shipment volumes (Phase 2) will reduce MAPE and improve directional accuracy.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
