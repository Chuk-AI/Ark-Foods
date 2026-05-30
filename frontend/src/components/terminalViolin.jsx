import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '../styles/terminalViolin.css';

const BoxTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 14px', fontSize: 13 }}>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>{d.name}</p>
        <p>Max: <strong>${d.max?.toFixed(2)}</strong></p>
        <p>Q3: <strong>${d.q3?.toFixed(2)}</strong></p>
        <p>Median: <strong>${d.median?.toFixed(2)}</strong></p>
        <p>Mean: <strong>${d.mean?.toFixed(2)}</strong></p>
        <p>Q1: <strong>${d.q1?.toFixed(2)}</strong></p>
        <p>Min: <strong>${d.min?.toFixed(2)}</strong></p>
        <p style={{ color: '#64748b' }}>n={d.count}</p>
      </div>
    );
  }
  return null;
};

const TerminalViolinPlot = () => {
  const [usdaData, setUsdaData] = useState([]);
  const [produceiqData, setProduceiqData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeFrame, setTimeFrame] = useState('7d');

  const fetchData = async (tf) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/terminal_price_violin?timeFrame=${tf}`);
      const data = await res.json();
      setUsdaData(data.usda || []);
      setProduceiqData(data.produceiq || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(timeFrame); }, [timeFrame]);

  const renderChart = (data, title, color) => (
    <div style={{ marginBottom: 32 }}>
      <h4 style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>{title}</h4>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: 'Inter' }} angle={-35} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 12, fontFamily: 'Inter' }} tickFormatter={v => `$${v}`} />
          <Tooltip content={<BoxTooltip />} />
          <Bar dataKey="median" fill={color} radius={[4, 4, 0, 0]} name="Median Price" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div id="terminal-violin-plot-section" className="section terminal-violin-chart-container">
      <div className="chart-title"><h2>Terminal Price Distribution</h2></div>
      <div className="time-frame-filters">
        <span style={{ textAlign: 'center', display: 'flex', alignItems: 'center' }}>Select a time frame</span>
        {['3d', '7d', '1m', '3m', '1y'].map(f => (
          <button key={f} onClick={() => setTimeFrame(f)} className={`time-frame-button ${timeFrame === f ? 'active' : ''}`}>{f.toUpperCase()}</button>
        ))}
      </div>
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading...</div>
      ) : (
        <div style={{ padding: '16px 0' }}>
          {renderChart(usdaData, 'USDA Terminal Prices', '#0d9488')}
          {renderChart(produceiqData, 'ProduceIQ Terminal Prices', '#0369a1')}
        </div>
      )}
    </div>
  );
};

export default TerminalViolinPlot;
