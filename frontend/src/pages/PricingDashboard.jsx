import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

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

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', borderBottom: '3px solid #059669', paddingBottom: 10, marginBottom: 20 }}>
      {children}
    </h2>
  );
}

function Badge({ children, type = 'info' }) {
  const colors = {
    success: { bg: '#d1fae5', color: '#065f46' },
    warning: { bg: '#fef3c7', color: '#92400e' },
    info:    { bg: '#dbeafe', color: '#1e40af' },
  };
  const c = colors[type] || colors.info;
  return (
    <span style={{ background: c.bg, color: c.color, padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
      {children}
    </span>
  );
}

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
    <div style={{ marginBottom: 40 }}>
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
                            <td style={{ padding: '10px 12px', color: '#475569', fontSize: 11, maxWidth: 140 }}>
                              {(p?.package || u?.package)
                                ? <span title={p?.package || u?.package}>{p?.package || u?.package}</span>
                                : <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {p?.raw_price != null
                                ? <><div style={{ fontWeight: 700, color: '#92400e' }}>{money(p.raw_price)}</div><div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{p.raw_unit || p.unit}</div></>
                                : <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {u?.raw_price != null
                                ? <><div style={{ fontWeight: 700, color: '#1e40af' }}>{money(u.raw_price)}</div><div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{u.raw_unit || u.unit}</div></>
                                : <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {p
                                ? <><div style={{ fontWeight: 700, color: '#92400e' }}>{money(p.price)}</div><div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{p.unit}</div><div style={{ fontSize: 10, color: '#94a3b8' }}>{p.date}</div></>
                                : <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
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
                    <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'top' }}>
                      {r.piq ? <><div style={{ fontWeight: 700, color: '#92400e' }}>{money(r.piq.price)}</div><div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{r.piq.unit}</div></> : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'top' }}>
                      {r.usda ? <><div style={{ fontWeight: 700, color: '#1e40af' }}>{money(r.usda.price)}</div><div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{r.usda.unit}</div></> : '—'}
                    </td>
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

export default function PricingDashboard() {
  return (
    <div style={{ padding: '28px 20px', maxWidth: 1600, margin: '0 auto', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif' }}>
      <PricingMatrix />
      <HighestPrices />
    </div>
  );
}
