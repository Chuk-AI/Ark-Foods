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

// ── Model diagnostics export ──────────────────────────────────────────────
function DiagnosticsExport() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  const run = () => {
    setBusy(true); setErr(null); setResult(null);
    axios.get('/api/forecast_hindcast_batch', {
      params: { horizon_weeks: 8, origins: 4, origin_step: 4, max_groups: 30, sweep: 1 },
      timeout: 180000,
    })
      .then(r => {
        if (r.data.error) { setErr(r.data.error); return; }
        setResult(r.data);
        // Trigger download
        const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ark-model-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      })
      .catch(e => setErr(e.message))
      .finally(() => setBusy(false));
  };

  const best = result?.best_params;
  const cur = result?.current_performance;
  const agg = result?.aggregate;

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            Model Diagnostics Export
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
            Runs rolling-origin hindcasts across ~30 segments at 4 as-of dates each, scoring
            every segment separately and rolling the results up by origin and size — pooled
            numbers hide that a Dominican 8&nbsp;lb line and an unsized 1&nbsp;bu line are
            different forecasting problems. Downloads a JSON file; send it back to retune.
          </div>
        </div>
        <button onClick={run} disabled={busy}
          style={{ padding: '9px 18px', fontSize: 12, fontWeight: 700, background: busy ? 'var(--text-3)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: busy ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
          {busy ? 'Running… (up to 2 min)' : 'Run & Download'}
        </button>
      </div>

      {err && (
        <div style={{ marginTop: 12, padding: '9px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, color: '#991b1b', fontSize: 12 }}>
          {err}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: '#15803d', fontWeight: 700, marginBottom: 10 }}>
            ✓ Downloaded — {result.summary?.total_runs} runs across {result.summary?.segments_analysed} segments
          </div>

          {/* Aggregate: micro vs macro */}
          {agg && (
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 12, marginBottom: 14 }}>
              {[
                ['Macro MAPE', `${agg.macro_mape}%`, 'segments weighted equally', '#1e293b'],
                ['Micro MAPE', `${agg.micro_mape}%`, 'all points pooled', 'var(--text-3)'],
                ['Median segment', `${agg.median_segment_mape}%`, null, 'var(--text-2)'],
                ['Best → worst', `${agg.best_segment_mape}% → ${agg.worst_segment_mape}%`, 'spread across segments', 'var(--text-2)'],
                ['Per-segment gain (out-of-sample)', agg.per_segment_tuning_gain_oos != null ? `${agg.per_segment_tuning_gain_oos > 0 ? '−' : '+'}${Math.abs(agg.per_segment_tuning_gain_oos)} pts` : '—', `hindsight would say ${agg.per_segment_tuning_gain_hindsight ?? '—'}`, 'var(--text-2)'],
                ['Volatility persistence', agg.volatility_persistence != null ? agg.volatility_persistence.toFixed(2) : '—', 'corr(recent, future) — gates adaptivity', agg.volatility_persistence > 0.4 ? '#15803d' : '#b45309'],
              ].map(([k, v, sub, col]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                  <div style={{ color: col, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                  {sub && <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{sub}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Origin / size rollups side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 14 }}>
            {[['By origin', result.by_origin, 'origin'], ['By size', result.by_size, 'item_size']].map(([title, rows, field]) => (
              <div key={title}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{title}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <tbody>
                    {(rows || []).slice(0, 8).map(r => (
                      <tr key={String(r[field])} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '4px 6px 4px 0', color: 'var(--text-2)' }}>{String(r[field])}</td>
                        <td style={{ padding: '4px 6px', color: 'var(--text-3)', textAlign: 'right' }}>{r.segments}seg</td>
                        <td style={{ padding: '4px 0 4px 6px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                          color: r.mape <= 15 ? '#15803d' : r.mape <= 22 ? '#b45309' : '#dc2626' }}>{r.mape}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Worst segments */}
          {result.segments?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
                Worst segments
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <tbody>
                    {result.segments.slice(0, 6).map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '4px 8px 4px 0', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{s.commodity} · {s.city}</td>
                        <td style={{ padding: '4px 8px', color: 'var(--text-3)' }}>{s.segment}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--text-3)' }}>
                          cv {s.recent_cv != null ? `${(s.recent_cv * 100).toFixed(0)}%` : '—'}
                        </td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{s.mape}%</td>
                        <td style={{ padding: '4px 0 4px 8px', textAlign: 'right', color: s.skill_score > 0 ? '#15803d' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                          {s.skill_score != null ? `${s.skill_score > 0 ? '+' : ''}${s.skill_score}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
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
function ErrorTable({ forecast, basePrice }) {
  const weeks = forecast.filter(f => f.actual != null);
  if (!weeks.length) return <p style={{ color: 'var(--text-3)', fontSize: 13, padding: '16px 0' }}>No actuals available yet for comparison.</p>;

  const maxErr = Math.max(...weeks.map(w => Math.abs(w.error || 0)), 0.01);

  const errColor = (pctErr) => {
    if (pctErr == null) return 'var(--text-3)';
    if (pctErr <= 5) return '#15803d';
    if (pctErr <= 12) return '#b45309';
    return '#dc2626';
  };

  const cols = [
    { h: 'Week', align: 'left' },
    { h: 'Date', align: 'left' },
    { h: 'Base @ forecast', align: 'center' },
    { h: 'Forecast', align: 'center' },
    { h: 'Actual', align: 'center' },
    { h: 'Error', align: 'center' },
    { h: '% Error', align: 'center' },
    { h: 'vs Naive', align: 'center' },
    { h: 'Error bar', align: 'left' },
    { h: '50%', align: 'center' },
    { h: '80%', align: 'center' },
    { h: '95%', align: 'center' },
  ];

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)' }}>
            {cols.map(c => (
              <th key={c.h} style={{
                padding: '9px 12px', textAlign: c.align,
                fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase',
                letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
              }}>{c.h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((f, i) => {
            const barW = Math.abs(f.error || 0) / maxErr * 100;
            const barColor = (f.error || 0) > 0 ? '#b45309' : '#2A6349';
            // Did the model beat "assume price never moved"?
            const beatNaive = f.naive_error != null && Math.abs(f.error || 0) < f.naive_error;
            return (
              <tr key={f.week} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)' }}>
                <td style={{ padding: '9px 12px', color: 'var(--text-3)', fontWeight: 600 }}>+{f.week}w</td>
                <td style={{ padding: '9px 12px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{f.week_label}</td>
                <td style={{ padding: '9px 12px', textAlign: 'center', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(f.base_price ?? basePrice)}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(f.median)}</td>
                <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: '#b45309', fontVariantNumeric: 'tabular-nums' }}>{fmt(f.actual)}</td>
                <td style={{ padding: '9px 12px', textAlign: 'center', color: (f.error || 0) > 0 ? '#dc2626' : '#15803d', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {f.error != null ? `${f.error > 0 ? '+' : ''}${f.error.toFixed(2)}` : '—'}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 700, color: errColor(f.error_pct) }}>
                  {pct(f.error_pct)}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 11 }}>
                  {f.naive_error == null ? '—' : beatNaive
                    ? <span style={{ color: '#15803d', fontWeight: 700 }}>✓ better</span>
                    : <span style={{ color: '#dc2626', fontWeight: 600 }}>worse</span>}
                </td>
                <td style={{ padding: '9px 12px', minWidth: 80 }}>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barW}%`, background: barColor, borderRadius: 3 }} />
                  </div>
                </td>
                {['in_ci_50', 'in_ci_80', 'in_ci_95'].map(k => (
                  <td key={k} style={{ padding: '9px 12px', textAlign: 'center' }}>
                    {f[k] === true
                      ? <span style={{ color: '#15803d', fontSize: 14 }}>✓</span>
                      : <span style={{ color: '#dc2626', fontSize: 12 }}>✗</span>}
                  </td>
                ))}
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
  const maxAbs = Math.max(
    ...forecast.map(f => Math.max(
      Math.abs(f.seasonal_component || 0),
      Math.abs(f.level_component || 0),
      Math.abs(f.trend_component || 0),
    )), 1);

  const Bar = ({ v, color }) => (
    <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, width: 90 }}>
      <div style={{ height: '100%', width: `${Math.min(Math.abs(v || 0) / maxAbs * 100, 100)}%`, background: color, borderRadius: 3 }} />
    </div>
  );
  const signed = (v) => `${v > 0 ? '+' : ''}${(v || 0).toFixed(2)}`;

  return (
    <div>
      <div style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text-3)', borderBottom: '1px solid var(--border)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--text-2)' }}>Forecast = Seasonal level + Level offset + Trend.</strong>{' '}
        Seasonal is where this week-of-year normally sits. Level offset is how far
        the market was above/below that when the forecast was made — it decays with a
        4-week half-life. Trend is short-term momentum, decaying over 6 weeks.
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Week', 'Seasonal', '', 'Level offset', '', 'Trend', '', 'Forecast', '± σ'].map((h, i) => (
                <th key={i} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {forecast.map((f, i) => (
              <tr key={f.week} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)' }}>
                <td style={{ padding: '7px 10px', color: 'var(--text-3)', fontWeight: 600 }}>+{f.week}w</td>
                <td style={{ padding: '7px 10px', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(f.seasonal_component)}</td>
                <td style={{ padding: '7px 10px' }}><Bar v={f.seasonal_component} color="#4a6a4a" /></td>
                <td style={{ padding: '7px 10px', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: (f.level_component || 0) >= 0 ? '#dc2626' : '#15803d' }}>
                  {signed(f.level_component)}
                </td>
                <td style={{ padding: '7px 10px' }}><Bar v={f.level_component} color={(f.level_component || 0) >= 0 ? '#dc2626' : '#15803d'} /></td>
                <td style={{ padding: '7px 10px', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: (f.trend_component || 0) >= 0 ? '#b45309' : '#2A6349' }}>
                  {signed(f.trend_component)}
                </td>
                <td style={{ padding: '7px 10px' }}><Bar v={f.trend_component} color={(f.trend_component || 0) >= 0 ? '#b45309' : '#2A6349'} /></td>
                <td style={{ padding: '7px 10px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(f.median)}</td>
                <td style={{ padding: '7px 10px', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>±{(f.sigma || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  const [segment, setSegment] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('error-table');

  const load = useCallback((segOverride) => {
    setLoading(true);
    setError(null);
    const params = { commodity, city, horizon_weeks: horizonWeeks };
    const seg = segOverride !== undefined ? segOverride : segment;
    if (seg) params.segment = seg;
    axios.get('/api/forecast_hindcast', { params })
      .then(r => {
        if (r.data.error) {
          setError(r.data.error);
          setData(null);
          if (r.data.commodities) setCommodities(r.data.commodities);
          if (r.data.cities) setCities(r.data.cities);
        } else {
          setData(r.data);
          if (r.data.commodities?.length) setCommodities(r.data.commodities);
          if (r.data.cities?.length) setCities(r.data.cities);
          if (!seg && r.data.active_segment) setSegment(r.data.active_segment);
        }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [commodity, city, horizonWeeks, segment]);

  useEffect(() => { load(''); }, []);

  // Reset segment when commodity/city changes — segments are per-market
  useEffect(() => { setSegment(''); }, [commodity, city]);

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

      <DiagnosticsExport />

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Segment (size / origin)</label>
          <select value={segment} onChange={e => { setSegment(e.target.value); load(e.target.value); }}
            style={{ fontSize: 13, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)', minWidth: 220 }}>
            <option value="__all__">All segments pooled</option>
            {(data?.segments || []).map(s => (
              <option key={s.segment} value={s.segment}>
                {s.segment} ({s.history_rows}h / {s.actual_rows}a)
              </option>
            ))}
          </select>
        </div>
        <button onClick={() => load()} disabled={loading}
          style={{ padding: '8px 20px', fontSize: 12, fontWeight: 700, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', alignSelf: 'flex-end', opacity: loading ? 0.6 : 1 }}>
          Run Hindcast
        </button>
      </div>

      {/* Run context strip */}
      {data && !loading && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, padding: '12px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 20, fontSize: 12 }}>
          {[
            ['Forecast made', data.as_of_date],
            ['Segment', data.active_segment === '__all__' ? 'All pooled' : data.active_segment],
            ['Base price then', fmt(data.base_price)],
            ['Seasonal norm', fmt(data.seasonal_at_as_of)],
            ['Level offset', data.level_offset != null ? `${data.level_offset > 0 ? '+' : ''}${data.level_offset.toFixed(2)}` : '—'],
            ['Recent volatility', data.recent_cv != null ? `${(data.recent_cv * 100).toFixed(1)}%` : '—'],
            ['Model weight', data.model_weight != null ? `${(data.model_weight * 100).toFixed(0)}%` : '—'],
            ['σ (residual)', fmt(data.sigma)],
            ['Trend slope', `${data.slope > 0 ? '+' : ''}${(data.slope || 0).toFixed(2)}/wk`],
            ['Training rows', data.training_rows],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</span>
              <span style={{ fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
            </div>
          ))}
        </div>
      )}
      {data?.segment_note && (
        <div style={{ padding: '9px 14px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, fontSize: 12, color: '#92400e', marginBottom: 16 }}>
          ⚠ {data.segment_note}
        </div>
      )}

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
              label="Skill vs Naive"
              value={m?.skill_score != null ? `${m.skill_score > 0 ? '+' : ''}${m.skill_score}%` : '—'}
              sub={m?.naive_mae != null ? `naive MAE ${fmt(m.naive_mae)}` : 'vs assume-no-change'}
              color={m?.skill_score == null ? 'var(--text-2)' : m.skill_score > 0 ? '#15803d' : '#dc2626'}
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
              {activeTab === 'error-table' && <ErrorTable forecast={data.forecast} basePrice={data.base_price} />}
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
                Volatility-gated blend of a flat base price and a seasonal model
                (shrunk ratios + mean-reverting level offset + decaying trend),
                anchored to base at short horizons. <strong>Model weight</strong> above shows
                how much the seasonal side was trusted — calm markets stay near
                the base price, where a flat forecast measurably wins.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
