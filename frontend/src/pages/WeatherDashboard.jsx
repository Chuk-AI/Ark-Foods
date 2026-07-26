import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
      <div style={{ width: 36, height: 36, border: '4px solid #e2e8f0', borderTop: '4px solid #059669', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function SectionTitle({ children, icon }) {
  return (
    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', borderBottom: '3px solid #059669', paddingBottom: 10, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
      {icon && <span>{icon}</span>}{children}
    </h2>
  );
}

function fTemp(v) { return v != null && !isNaN(Number(v)) ? `${Math.round(Number(v))}°F` : '—'; }
function fPrcp(v) { return v != null && !isNaN(Number(v)) ? `${Number(v).toFixed(2)}"` : '—'; }

// Actual WT360 field names — plain numbers stored as strings in historical, numbers in forecast
function n(v) { return v == null ? null : (isNaN(Number(v)) ? null : Number(v)); }
function getHi(d)   { return n(d.maxTemp); }
function getLo(d)   { return n(d.minTemp); }
function getAvg(d)  { return n(d.avgTemp); }
function getPrcp(d) { return n(d.prcp); }
function getGDD(d)  { return n(d.gdd); }
// Forecast uses utc_date_iso; historical uses utcDate
function getDate(d) { return d.utc_date_iso || d.utcDate || d.date || d.Date || d.week_start || ''; }

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
    <div style={{ background: 'linear-gradient(135deg,#fef2f2,#fee2e2)', border: '1px solid #fca5a5', borderRadius: 10, padding: '14px 20px', marginBottom: 28 }}>
      <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 16, marginBottom: 8 }}>Active Weather Alerts</div>
      {alerts.map((a, i) => (
        <div key={i} style={{ fontSize: 14, color: '#7f1d1d', marginBottom: 4 }}>
          <strong>{a.location}:</strong> {a.headline || a.description || a.type || JSON.stringify(a)}
        </div>
      ))}
    </div>
  );
}

// ─── 2. Region Cards ──────────────────────────────────────────────────────────

function TempStrip({ days }) {
  if (!days || days.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
      {days.slice(0, 7).map((d, i) => (
        <div key={i} style={{ flex: 1, textAlign: 'center', background: '#f0fdf4', borderRadius: 6, padding: '4px 2px' }}>
          <div style={{ fontSize: 10, color: '#64748b' }}>{formatDateLabel(getDate(d))}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>{fTemp(getHi(d))}</div>
          <div style={{ fontSize: 11, color: '#2563eb' }}>{fTemp(getLo(d))}</div>
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
  const avg  = getAvg(today);
  const prcp = getPrcp(today);
  const gdd  = getGDD(today);

  return (
    <div onClick={() => onSelect(loc)} style={{
      background: selected ? 'linear-gradient(135deg,#ecfdf5,#d1fae5)' : 'white',
      border: selected ? '2px solid #059669' : '1px solid #e2e8f0',
      borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all .2s',
      boxShadow: selected ? '0 4px 12px rgba(5,150,105,.2)' : '0 1px 4px rgba(0,0,0,.06)',
    }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{loc.name}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{loc.state}, {loc.country}</div>
      {loc.error ? (
        <div style={{ fontSize: 12, color: '#dc2626' }}>No forecast data</div>
      ) : days.length === 0 ? (
        <div style={{ fontSize: 12, color: '#94a3b8' }}>Loading...</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {hi   != null && <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>Hi {fTemp(hi)}</span>}
            {lo   != null && <span style={{ fontSize: 13, color: '#2563eb', fontWeight: 600 }}>Lo {fTemp(lo)}</span>}
            {avg  != null && <span style={{ fontSize: 13, color: '#475569' }}>Avg {fTemp(avg)}</span>}
          </div>
          {prcp != null && <div style={{ fontSize: 12, color: '#0284c7', marginTop: 4 }}>Precip {fPrcp(prcp)}</div>}
          {gdd  != null && <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 2 }}>GDD {Number(gdd).toFixed(1)}</div>}
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{loc.crops?.join(', ')}</div>
          <TempStrip days={days} />
        </>
      )}
    </div>
  );
}

function RegionCards({ onSelectLocation }) {
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
  if (error)   return <div style={{ color: '#dc2626', padding: 16 }}>Error: {error}</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 14 }}>
      {regions.map(loc => (
        <RegionCard key={loc.key} loc={loc} selected={selected === loc.key}
          onSelect={l => { setSelected(l.key); onSelectLocation(l); }} />
      ))}
    </div>
  );
}

// ─── 3. 14-Day Forecast Detail ────────────────────────────────────────────────

function ForecastDetail({ location }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!location) return;
    setLoading(true); setError(null);
    axios.get(`/api/wt360/forecast/${location.key}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [location && location.key]);

  if (!location) return <div style={{ color: '#94a3b8', padding: 16 }}>Select a region above to see the 14-day forecast.</div>;
  if (loading)   return <Spinner />;
  if (error)     return <div style={{ color: '#dc2626', padding: 16 }}>Error: {error}</div>;
  if (!data)     return null;

  const days = data.forecast || [];
  return (
    <div>
      <div style={{ fontWeight: 600, color: '#475569', marginBottom: 12 }}>{location.name}, {location.state} — 14-Day Outlook</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 700 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              {['Date','High','Low','Pop %','Precip'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((d, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{formatDateLabel(getDate(d))}</td>
                <td style={{ padding: '9px 12px', fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{fTemp(getHi(d))}</td>
                <td style={{ padding: '9px 12px', fontSize: 13, color: '#2563eb', fontWeight: 600 }}>{fTemp(getLo(d))}</td>
                <td style={{ padding: '9px 12px', fontSize: 13, color: '#475569' }}>{d.pop != null ? `${d.pop}%` : '—'}</td>
                <td style={{ padding: '9px 12px', fontSize: 13, color: '#0284c7' }}>{fPrcp(getPrcp(d))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 4. Long-Range Outlook ────────────────────────────────────────────────────

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

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}000000`;
}

function LongRangeOutlook() {
  const [locKey, setLocKey]   = useState('vineland_nj');
  const [weeks, setWeeks]     = useState(12);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
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
          { type: 'line', label: 'Avg Temp (F)', data: avgTemps, borderColor: '#059669', backgroundColor: 'rgba(5,150,105,.1)', tension: .3, yAxisID: 'y', pointRadius: 3 },
          { type: 'line', label: 'High (F)',     data: maxTemps, borderColor: '#dc2626', borderDash: [4,3], backgroundColor: 'transparent', tension: .3, yAxisID: 'y', pointRadius: 2 },
          { type: 'line', label: 'Low (F)',      data: minTemps, borderColor: '#2563eb', borderDash: [4,3], backgroundColor: 'transparent', tension: .3, yAxisID: 'y', pointRadius: 2 },
          { type: 'bar',  label: 'Precip (in)',  data: prcps,    backgroundColor: 'rgba(14,165,233,.4)', yAxisID: 'y2' },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top' } },
        scales: {
          y:  { title: { display: true, text: 'Temperature (F)' }, position: 'left' },
          y2: { title: { display: true, text: 'Precipitation (in)' }, position: 'right', grid: { drawOnChartArea: false }, beginAtZero: true },
        }
      }
    });
  }, [data]);

  useEffect(() => () => { if (chartInst.current) chartInst.current.destroy(); }, []);

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Location</label>
          <select value={locKey} onChange={e => setLocKey(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '7px 10px', fontSize: 13 }}>
            {WT360_LOCATION_KEYS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Horizon: {weeks} weeks</label>
          <input type="range" min={2} max={52} value={weeks} onChange={e => setWeeks(Number(e.target.value))} style={{ width: 180, accentColor: '#059669' }} />
        </div>
        <button onClick={fetchData} style={{ background: '#059669', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
          {loading ? 'Loading...' : 'Update'}
        </button>
      </div>
      {error && <div style={{ color: '#dc2626', marginBottom: 12, fontSize: 13 }}>Error: {error}</div>}
      <div style={{ position: 'relative', height: 360 }}>
        {loading ? <Spinner /> : <canvas ref={chartRef} />}
      </div>
    </div>
  );
}

// ─── 5. GDD Tracker ───────────────────────────────────────────────────────────

function GDDTracker() {
  const [locKey, setLocKey]       = useState('vineland_nj');
  const [plantDate, setPlantDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 2); return d.toISOString().slice(0, 10);
  });
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
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

  const totalGDD = !data ? null : (data.daily_data || [])
    .reduce((s, d) => s + (Number(getGDD(d) ?? 0) || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Location</label>
          <select value={locKey} onChange={e => setLocKey(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '7px 10px', fontSize: 13 }}>
            {WT360_LOCATION_KEYS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Planting Date</label>
          <input type="date" value={plantDate} onChange={e => setPlantDate(e.target.value)} style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '7px 10px', fontSize: 13 }} />
        </div>
        <button onClick={fetchData} style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
          {loading ? 'Loading...' : 'Track GDD'}
        </button>
        {totalGDD != null && (
          <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 8, padding: '8px 16px', fontWeight: 700, color: '#5b21b6', fontSize: 14 }}>
            Total GDD: {totalGDD.toFixed(1)}
          </div>
        )}
      </div>
      {error && <div style={{ color: '#dc2626', marginBottom: 12, fontSize: 13 }}>Error: {error}</div>}
      <div style={{ position: 'relative', height: 320 }}>
        {loading ? <Spinner /> : <canvas ref={chartRef} />}
      </div>
    </div>
  );
}

// ─── 6. Growing Conditions reference ─────────────────────────────────────────

const GROWING_CONDITIONS = {
  'Jalapeno':      { tempMin: 65, tempMax: 85, humMin: 40, humMax: 70 },
  'Serrano':       { tempMin: 65, tempMax: 90, humMin: 40, humMax: 70 },
  'Poblano':       { tempMin: 60, tempMax: 85, humMin: 40, humMax: 70 },
  'Habanero':      { tempMin: 70, tempMax: 90, humMin: 50, humMax: 75 },
  'Anaheim':       { tempMin: 65, tempMax: 90, humMin: 30, humMax: 65 },
  'Cubanelle':     { tempMin: 60, tempMax: 85, humMin: 40, humMax: 70 },
  'Fresno':        { tempMin: 65, tempMax: 85, humMin: 40, humMax: 65 },
  'Hungarian Wax': { tempMin: 65, tempMax: 85, humMin: 40, humMax: 65 },
  'Shishito':      { tempMin: 60, tempMax: 85, humMin: 40, humMax: 70 },
  'Long Hot':      { tempMin: 65, tempMax: 85, humMin: 40, humMax: 65 },
};

function GrowingConditionsTable() {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            {['Variety','Min Temp (F)','Max Temp (F)','Min Humidity (%)','Max Humidity (%)'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(GROWING_CONDITIONS).map(([name, c], i) => (
            <tr key={name} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
              <td style={{ padding: '9px 14px', fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{name}</td>
              <td style={{ padding: '9px 14px', color: '#2563eb', fontSize: 13 }}>{c.tempMin}</td>
              <td style={{ padding: '9px 14px', color: '#dc2626', fontSize: 13 }}>{c.tempMax}</td>
              <td style={{ padding: '9px 14px', color: '#0284c7', fontSize: 13 }}>{c.humMin}</td>
              <td style={{ padding: '9px 14px', color: '#0284c7', fontSize: 13 }}>{c.humMax}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function WeatherDashboard() {
  const [selectedLocation, setSelectedLocation] = useState(null);

  return (
    <div style={{ padding: '24px 28px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', margin: 0 }}>Weather Intelligence</h1>
          <p style={{ color: '#64748b', margin: '6px 0 0', fontSize: 14 }}>Powered by WeatherTrends360 — 14 growing regions, 14-day forecasts, long-range outlooks up to 52 weeks</p>
        </div>

        <AlertsBanner />

        <div style={{ background: 'white', borderRadius: 14, padding: 24, marginBottom: 24, boxShadow: '0 1px 6px rgba(0,0,0,.07)' }}>
          <SectionTitle icon="Region">Growing Regions — Today's Snapshot</SectionTitle>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Click a region card to load its 14-day forecast detail below.</p>
          <RegionCards onSelectLocation={setSelectedLocation} />
        </div>

        <div style={{ background: 'white', borderRadius: 14, padding: 24, marginBottom: 24, boxShadow: '0 1px 6px rgba(0,0,0,.07)' }}>
          <SectionTitle icon="14-Day">14-Day Forecast Detail</SectionTitle>
          <ForecastDetail location={selectedLocation} />
        </div>

        <div style={{ background: 'white', borderRadius: 14, padding: 24, marginBottom: 24, boxShadow: '0 1px 6px rgba(0,0,0,.07)' }}>
          <SectionTitle icon="Long-Range">Long-Range Outlook (up to 52 weeks)</SectionTitle>
          <LongRangeOutlook />
        </div>

        <div style={{ background: 'white', borderRadius: 14, padding: 24, marginBottom: 24, boxShadow: '0 1px 6px rgba(0,0,0,.07)' }}>
          <SectionTitle icon="GDD">Growing Degree Days (GDD) Tracker</SectionTitle>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Select a location and planting date to track cumulative heat accumulation.</p>
          <GDDTracker />
        </div>

        <div style={{ background: 'white', borderRadius: 14, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,.07)' }}>
          <SectionTitle icon="Conditions">Optimal Growing Conditions by Variety</SectionTitle>
          <GrowingConditionsTable />
        </div>

      </div>
    </div>
  );
}
