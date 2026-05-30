import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '../styles/shippingViolin.css';

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

export default function ShippingViolinPlot() {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeFrame, setTimeFrame] = useState('7d');

  const fetchData = async (tf) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shipping_price_violin?timeFrame=${tf}`);
      const json = await res.json();
      setChartData(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(timeFrame); }, [timeFrame]);

  return (
    <div id="shipping-violin-plot-section" className="section shipping-violin-chart-container">
      <div className="chart-title"><h2>Shipping Price Distribution</h2></div>
      <div className="time-frame-filters">
        <span style={{ textAlign: 'center', display: 'flex', alignItems: 'center' }}>Select a time frame</span>
        {['3d', '7d', '1m', '3m', '1y'].map(f => (
          <button key={f} onClick={() => setTimeFrame(f)} className={`time-frame-button ${timeFrame === f ? 'active' : ''}`}>
            {f.toUpperCase()}
            {timeFrame === f && <div className="underline"></div>}
          </button>
        ))}
      </div>
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading...</div>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: 'Inter' }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 12, fontFamily: 'Inter' }} tickFormatter={v => `$${v}`} />
            <Tooltip content={<BoxTooltip />} />
            <Bar dataKey="median" fill="#0d9488" radius={[4, 4, 0, 0]} name="Median Price" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
