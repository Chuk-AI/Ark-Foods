import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

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

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr);
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const dt = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`);
    if (!isNaN(dt)) return `${MONTH_ABBR[dt.getUTCMonth()]} ${dt.getUTCDate()}`;
  }
  const digits = s.replace(/\D/g, '');
  if (digits.length >= 8) {
    const dt = new Date(`${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}`);
    if (!isNaN(dt)) return `${MONTH_ABBR[dt.getUTCMonth()]} ${dt.getUTCDate()}`;
  }
  return s;
}

function fAlertTime(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString(undefined, { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }); }
  catch { return iso; }
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}000000`;
}

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

// ─── Stat chip ────────────────────────────────────────────────────────────────
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
  { id: 'overview',    label: 'Overview',         icon: '🗺' },
  { id: 'forecast',   label: '14-Day Forecast',  icon: '📅' },
  { id: 'longrange',  label: 'Long-Range',       icon: '📈' },
  { id: 'yoy',        label: 'Year-on-Year',     icon: '📊' },
  { id: 'gdd',        label: 'GDD Tracker',      icon: '🌱' },
  { id: 'conditions', label: 'Growing Conditions', icon: '🌿' },
];

function TabBar({ active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 24, overflowX: 'auto', flexShrink: 0 }}>
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: active === t.id ? 600 : 500,
            color: active === t.id ? 'var(--accent)' : 'var(--text-2)',
            borderBottom: active === t.id ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
            transition: 'color .12s',
          }}
        >
          <span>{t.icon}</span>{t.label}
        </button>
      ))}
    </div>
  );
}

// ─── 1. Alerts Banner ─────────────────────────────────────────────────────────

function AlertsBanner() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/wt360/alerts')
      .then(r => {
        const all = [];
        (r.data.alerts || []).forEach(loc => {
          (loc.alerts || []).forEach(a => all.push({ ...a, location: loc.name }));
        });
        setAlerts(all);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || alerts.length === 0) return null;

  return (
    <div style={{ background: 'var(--down-soft)', border: '1px solid oklch(0.62 0.18 25 / 0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
      <div style={{ fontWeight: 700, color: 'var(--down)', fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>⚠️</span> Active Weather Alerts ({alerts.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {alerts.map((a, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid oklch(0.62 0.18 25 / 0.2)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--down)' }}>{a.title || 'Weather Alert'}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 10 }}>{a.location}</span>
            </div>
            {(a.start || a.end) && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 5 }}>
                {a.start && <span>From {fAlertTime(a.start)}</span>}
                {a.end && <span> until {fAlertTime(a.end)}</span>}
              </div>
            )}
            {a.content && (
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                {a.content.length > 280 ? a.content.slice(0, 280) + '…' : a.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 2. Region Cards (Overview tab) ──────────────────────────────────────────

function TempStrip({ days }) {
  if (!days || days.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 3, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
      {days.slice(0, 7).map((d, i) => (
        <div key={i} style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: 'var(--text-4)', marginBottom: 2 }}>{formatDateLabel(getDate(d))}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--down)' }}>{fTemp(getHi(d))}</div>
          <div style={{ fontSize: 10, color: 'var(--c2)' }}>{fTemp(getLo(d))}</div>
        </div>
      ))}
    </div>
  );
}

function RegionCard({ loc, onSelect, selected }) {
  const days  = loc.forecast || [];
  const today = days[0] || {};
  const hi   = getHi(today);
  const lo   = getLo(today);
  const prcp = getPrcp(today);
  const gdd  = getGDD(today);
  const hum  = getHum(today);
  const wspd = getWSpd(today);
  const pop  = getPop(today);

  return (
    <div
      onClick={() => onSelect(loc)}
      className="card"
      style={{
        cursor: 'pointer',
        border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
        background: selected ? 'var(--accent-soft)' : 'var(--surface)',
        transition: 'all .15s',
        margin: 0,
      }}
    >
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 1 }}>{loc.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>{loc.state}, {loc.country}</div>

        {loc.error ? (
          <div style={{ fontSize: 12, color: 'var(--down)' }}>No data</div>
        ) : days.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-4)' }}>Loading…</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
              {hi != null && <Stat label="High" value={fTemp(hi)} color="var(--down)" />}
              {lo != null && <Stat label="Low"  value={fTemp(lo)} color="var(--c2)" />}
              {prcp != null && <Stat label="Precip" value={fPrcp(prcp)} color="var(--c1)" />}
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
              {pop  != null && <Stat label="PoP"      value={fPct(pop)} color="var(--c1)" />}
              {hum  != null && <Stat label="Humidity" value={fPct(hum)} color="var(--c7)" />}
              {wspd != null && <Stat label="Wind"     value={fSpd(wspd)} color="var(--text-2)" />}
            </div>
            {gdd != null && (
              <div style={{ fontSize: 11, color: 'var(--c5)', marginTop: 4 }}>GDD {Number(gdd).toFixed(1)}</div>
            )}
            {loc.crops && loc.crops.length > 0 && (
              <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 4 }}>{loc.crops.join(', ')}</div>
            )}
            <TempStrip days={days} />
          </>
        )}
      </div>
    </div>
  );
}

function OverviewTab({ onSelectLocation }) {
  const [regions, setRegions]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axios.get('/api/wt360/forecast_all')
      .then(r => {
        const data = r.data.locations || [];
        setRegions(data);
        if (data.length > 0) { setSelected(data[0].key); onSelectLocation(data[0]); }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <div style={{ color: 'var(--down)', padding: 16 }}>Error loading regions: {error}</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
      {regions.map(loc => (
        <RegionCard key={loc.key} loc={loc} selected={selected === loc.key}
          onSelect={l => { setSelected(l.key); onSelectLocation(l); }} />
      ))}
    </div>
  );
}

// ─── 3. 14-Day Forecast Detail ────────────────────────────────────────────────

function ForecastTab({ defaultLocation }) {
  const [locKey, setLocKey]   = useState(defaultLocation?.key || 'vineland_nj');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetchForecast = useCallback((key) => {
    setLoading(true); setError(null);
    axios.get(`/api/wt360/forecast/${key}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchForecast(locKey); }, [locKey]);

  const days = data?.forecast || [];
  const loc  = WT360_LOCATION_KEYS.find(l => l.key === locKey);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Location</label>
          <select value={locKey} onChange={e => setLocKey(e.target.value)} className="form-select" style={{ width: 200 }}>
            {WT360_LOCATION_KEYS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
        </div>
        {loc && <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', paddingTop: 20 }}>{loc.label} — 14-Day Forecast</div>}
      </div>

      {loading ? <Spinner /> : error ? (
        <div style={{ color: 'var(--down)', padding: 16 }}>Error: {error}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                {['Date','High','Low','PoP','Precip','Humidity','Wind','UV'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{formatDateLabel(getDate(d))}</td>
                  <td style={{ color: 'var(--down)', fontWeight: 600 }}>{fTemp(getHi(d))}</td>
                  <td style={{ color: 'var(--c2)', fontWeight: 600 }}>{fTemp(getLo(d))}</td>
                  <td>{fPct(getPop(d))}</td>
                  <td style={{ color: 'var(--c1)' }}>{fPrcp(getPrcp(d))}</td>
                  <td style={{ color: 'var(--c7)' }}>{fPct(getHum(d))}</td>
                  <td>{getWSpd(d) != null ? fSpd(getWSpd(d)) : '—'}{getGust(d) != null ? ` (g ${Math.round(getGust(d))})` : ''}</td>
                  <td style={{ color: 'var(--warn)' }}>{getUV(d) != null ? Number(getUV(d)).toFixed(1) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── 4. Long-Range Outlook ────────────────────────────────────────────────────

function LongRangeTab() {
  const [locKey, setLocKey] = useState('vineland_nj');
  const [weeks, setWeeks]   = useState(12);
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const chartRef  = useRef(null);
  const chartInst = useRef(null);

  const fetchData = useCallback(() => {
    setLoading(true); setError(null);
    axios.get('/api/wt360/longrange', {
      params: { loc_id: locKey, start_date: todayStr(), weeks, fields: 'avgTemp,maxTemp,minTemp,prcp' }
    })
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [locKey, weeks]);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!data || !chartRef.current) return;
    const wdata = data.weekly_data || [];
    if (wdata.length === 0) return;

    const labels   = wdata.map((w, i) => { const d = getDate(w); return d ? formatDateLabel(d) : `Wk ${i+1}`; });
    const avgTemps = wdata.map(w => getAvg(w));
    const maxTemps = wdata.map(w => getHi(w));
    const minTemps = wdata.map(w => getLo(w));
    const prcps    = wdata.map(w => getPrcp(w));

    if (chartInst.current) chartInst.current.destroy();
    chartInst.current = new Chart(chartRef.current.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { type: 'line', label: 'Avg Temp (°F)', data: avgTemps, borderColor: '#059669', backgroundColor: 'rgba(5,150,105,.1)', tension: .3, yAxisID: 'y', pointRadius: 3 },
          { type: 'line', label: 'High (°F)',     data: maxTemps, borderColor: '#dc2626', borderDash: [4,3], backgroundColor: 'transparent', tension: .3, yAxisID: 'y', pointRadius: 2 },
          { type: 'line', label: 'Low (°F)',      data: minTemps, borderColor: '#2563eb', borderDash: [4,3], backgroundColor: 'transparent', tension: .3, yAxisID: 'y', pointRadius: 2 },
          { type: 'bar',  label: 'Precip (in)',   data: prcps,    backgroundColor: 'rgba(14,165,233,.35)', yAxisID: 'y2' },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top' } },
        scales: {
          y:  { title: { display: true, text: 'Temperature (°F)' }, position: 'left' },
          y2: { title: { display: true, text: 'Precip (in)' }, position: 'right', grid: { drawOnChartArea: false }, beginAtZero: true },
        }
      }
    });
  }, [data]);

  useEffect(() => () => { if (chartInst.current) chartInst.current.destroy(); }, []);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Location</label>
          <select value={locKey} onChange={e => setLocKey(e.target.value)} className="form-select" style={{ width: 200 }}>
            {WT360_LOCATION_KEYS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Horizon: {weeks} weeks</label>
          <input type="range" min={2} max={52} value={weeks} onChange={e => setWeeks(Number(e.target.value))} style={{ width: 160, accentColor: 'var(--accent)' }} />
        </div>
        <button onClick={fetchData} className="btn btn-primary" disabled={loading}>
          {loading ? 'Loading…' : 'Update Chart'}
        </button>
      </div>
      {error && <div style={{ color: 'var(--down)', marginBottom: 12, fontSize: 13 }}>Error: {error}</div>}
      <div style={{ position: 'relative', height: 380 }}>
        {loading ? <Spinner /> : <canvas ref={chartRef} />}
      </div>
    </div>
  );
}

// ─── 5. Year-on-Year Analysis ─────────────────────────────────────────────────

const MONTH_OPTS = [
  { val: '01', label: 'January' }, { val: '02', label: 'February' }, { val: '03', label: 'March' },
  { val: '04', label: 'April'   }, { val: '05', label: 'May'      }, { val: '06', label: 'June'  },
  { val: '07', label: 'July'    }, { val: '08', label: 'August'   }, { val: '09', label: 'September' },
  { val: '10', label: 'October' }, { val: '11', label: 'November' }, { val: '12', label: 'December'  },
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

  const METRICS = [
    { val: 'avgTemp', label: 'Avg Temp',   color: '#059669' },
    { val: 'maxTemp', label: 'High Temp',  color: '#dc2626' },
    { val: 'minTemp', label: 'Low Temp',   color: '#2563eb' },
    { val: 'prcp',    label: 'Precip',     color: '#0ea5e9' },
    { val: 'gdd',     label: 'GDD',        color: '#7c3aed' },
  ];

  const fetchData = useCallback(() => {
    setLoading(true); setError(null);
    const startMmdd = `${startMM}01`;
    const endDay   = new Date(2000, parseInt(endMM), 0).getDate();
    const endMmdd  = `${endMM}${endDay}`;
    axios.get('/api/wt360/yoy', {
      params: { loc_id: locKey, start_mmdd: startMmdd, end_mmdd: endMmdd, years: numYears, fields: 'avgTemp,maxTemp,minTemp,prcp,gdd' }
    })
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [locKey, startMM, endMM, numYears]);

  useEffect(() => {
    if (!data || !chartRef.current) return;
    const yearsData = data.years || {};
    const years = Object.keys(yearsData).sort().reverse();
    if (years.length === 0) return;

    const accessors = { avgTemp: getAvg, maxTemp: getHi, minTemp: getLo, prcp: getPrcp, gdd: getGDD };
    const accessor = accessors[metric] || getAvg;

    const datasets = years.map((yr, i) => {
      const wx = yearsData[yr] || [];
      return {
        label: yr,
        data: wx.map(d => accessor(d)),
        borderColor: YOY_COLORS[i % YOY_COLORS.length],
        backgroundColor: 'transparent',
        tension: 0.3, pointRadius: 0, pointHoverRadius: 3,
        borderWidth: i === 0 ? 2.5 : 1.5,
      };
    });

    const maxLen = Math.max(...years.map(yr => (yearsData[yr] || []).length));
    const labels = Array.from({ length: maxLen }, (_, i) => `Day ${i + 1}`);

    if (chartInst.current) chartInst.current.destroy();
    chartInst.current = new Chart(chartRef.current.getContext('2d'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top' } },
        scales: {
          x: { ticks: { maxTicksLimit: 12, maxRotation: 0 } },
          y: { title: { display: true, text: METRICS.find(m => m.val === metric)?.label || '' } },
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
        <button onClick={fetchData} className="btn btn-primary" disabled={loading}>
          {loading ? 'Loading…' : 'Compare Years'}
        </button>
      </div>

      {data && !loading && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {METRICS.map(m => (
            <button
              key={m.val}
              onClick={() => setMetric(m.val)}
              className="btn btn-sm"
              style={{
                background: metric === m.val ? m.color : 'var(--surface)',
                color: metric === m.val ? 'white' : 'var(--text-2)',
                borderColor: metric === m.val ? m.color : 'var(--border)',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {error && <div style={{ color: 'var(--down)', marginBottom: 12, fontSize: 13 }}>Error: {error}</div>}

      {!data && !loading && !error && (
        <div className="empty">
          <div className="empty-title">No data yet</div>
          <div className="empty-sub">Select filters above and click Compare Years to load historical data.</div>
        </div>
      )}

      {(data || loading) && (
        <div style={{ position: 'relative', height: 400 }}>
          {loading ? <Spinner /> : <canvas ref={chartRef} />}
        </div>
      )}

      {data && !loading && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Year Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {Object.entries(data.years || {}).sort((a,b) => b[0]-a[0]).map(([yr, wx], i) => {
              if (!wx || wx.length === 0) return null;
              const accessors = { avgTemp: getAvg, maxTemp: getHi, minTemp: getLo, prcp: getPrcp, gdd: getGDD };
              const accessor  = accessors[metric] || getAvg;
              const vals = wx.map(accessor).filter(v => v != null);
              if (vals.length === 0) return null;
              const avg  = vals.reduce((a,b) => a+b, 0) / vals.length;
              const max  = Math.max(...vals);
              const min  = Math.min(...vals);
              const sum  = vals.reduce((a,b) => a+b, 0);
              const showSum = metric === 'prcp' || metric === 'gdd';
              return (
                <div key={yr} style={{ background: 'var(--surface-2)', border: `1px solid ${YOY_COLORS[i % YOY_COLORS.length]}40`, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: YOY_COLORS[i % YOY_COLORS.length], marginBottom: 6 }}>{yr}</div>
                  {showSum ? (
                    <Stat label="Total" value={metric === 'prcp' ? fPrcp(sum) : sum.toFixed(1)} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <Stat label="Avg" value={fTemp(avg)} />
                      <Stat label="Peak" value={fTemp(max)} color="var(--down)" />
                      <Stat label="Low"  value={fTemp(min)} color="var(--c2)" />
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 4 }}>{vals.length} days</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 6. GDD Tracker ───────────────────────────────────────────────────────────

function GDDTab() {
  const [locKey, setLocKey]       = useState('vineland_nj');
  const [plantDate, setPlantDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 2); return d.toISOString().slice(0, 10);
  });
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const chartRef  = useRef(null);
  const chartInst = useRef(null);

  const fetchData = useCallback(() => {
    setLoading(true); setError(null);
    const today = new Date();
    const plant = new Date(plantDate);
    const days  = Math.max(1, Math.round((today - plant) / 86400000));
    const startDate = plantDate.replace(/-/g, '') + '000000';
    axios.get('/api/wt360/historical', { params: { loc_id: locKey, start_date: startDate, days, fields: 'gdd' } })
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [locKey, plantDate]);

  useEffect(() => {
    if (!data || !chartRef.current) return;
    const days = data.daily_data || [];
    if (days.length === 0) return;

    let cum = 0;
    const cumGDD = days.map(d => { cum += Number(getGDD(d) ?? 0) || 0; return cum; });
    const labels = days.map((d, i) => { const dt = getDate(d); return dt ? formatDateLabel(dt) : `Day ${i+1}`; });

    if (chartInst.current) chartInst.current.destroy();
    chartInst.current = new Chart(chartRef.current.getContext('2d'), {
      type: 'line',
      data: { labels, datasets: [{ label: 'Cumulative GDD', data: cumGDD, borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,.1)', fill: true, tension: .3, pointRadius: 2 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: ctx => `Cumulative GDD: ${ctx.parsed.y.toFixed(1)}` } } },
        scales: { y: { title: { display: true, text: 'Growing Degree Days (cumulative)' } }, x: { ticks: { maxRotation: 45, maxTicksLimit: 12 } } }
      }
    });
  }, [data]);

  useEffect(() => () => { if (chartInst.current) chartInst.current.destroy(); }, []);

  const totalGDD = !data ? null : (data.daily_data || []).reduce((s, d) => s + (Number(getGDD(d) ?? 0) || 0), 0);

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>Track heat accumulation from a planting date to estimate crop maturity.</p>
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
        <button onClick={fetchData} className="btn" style={{ background: '#7c3aed', color: 'white', borderColor: '#7c3aed' }} disabled={loading}>
          {loading ? 'Loading…' : 'Track GDD'}
        </button>
        {totalGDD != null && (
          <div style={{ background: 'oklch(0.94 0.04 300)', border: '1px solid oklch(0.78 0.09 300)', borderRadius: 8, padding: '8px 16px', fontWeight: 700, color: '#5b21b6', fontSize: 14 }}>
            Total: {totalGDD.toFixed(1)} GDD
          </div>
        )}
      </div>
      {error && <div style={{ color: 'var(--down)', marginBottom: 12, fontSize: 13 }}>Error: {error}</div>}
      <div style={{ position: 'relative', height: 340 }}>
        {loading ? <Spinner /> : <canvas ref={chartRef} />}
      </div>
    </div>
  );
}

// ─── 7. Growing Conditions reference ──────────────────────────────────────────

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
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>Optimal growing ranges for Ark Foods pepper varieties. Use with the GDD Tracker to estimate crop readiness.</p>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {['Variety','Min Temp (°F)','Max Temp (°F)','Min Humidity (%)','Max Humidity (%)','GDD Target'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function WeatherDashboard() {
  const [activeTab, setActiveTab]         = useState('overview');
  const [selectedLocation, setSelectedLocation] = useState(null);

  const handleSelectLocation = useCallback((loc) => {
    setSelectedLocation(loc);
  }, []);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-h1">Weather Intelligence</h1>
          <p className="page-sub">Powered by WeatherTrends360 — 14 growing regions across USA &amp; Mexico</p>
        </div>
      </div>

      <AlertsBanner />

      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-body">
          <TabBar active={activeTab} onChange={setActiveTab} />

          {activeTab === 'overview' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
                Today's snapshot for all 14 growing regions. Click a card to load its 14-day forecast in the <strong>14-Day Forecast</strong> tab.
              </p>
              <OverviewTab onSelectLocation={(loc) => { handleSelectLocation(loc); setActiveTab('forecast'); }} />
            </div>
          )}

          {activeTab === 'forecast' && (
            <ForecastTab defaultLocation={selectedLocation} />
          )}

          {activeTab === 'longrange' && <LongRangeTab />}

          {activeTab === 'yoy' && <YoYTab />}

          {activeTab === 'gdd' && <GDDTab />}

          {activeTab === 'conditions' && <ConditionsTab />}
        </div>
      </div>
    </div>
  );
}
