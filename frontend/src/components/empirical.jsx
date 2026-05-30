import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import "../styles/empirical.css";

function EmpiricalChart({ apiEndpoint, title }) {
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFrame, setTimeFrame] = useState("7d");

  const fetchCharts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiEndpoint}?timeFrame=${timeFrame}`);
      if (!response.ok) throw new Error("Failed to fetch data");
      const result = await response.json();
      setCharts(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCharts(); }, [timeFrame, apiEndpoint]);

  return (
    <div className="empirical-chart-container">
      <h2 className="chart-title">{title} Distribution</h2>
      <div className="time-frame-filters">
        <span>Select a time frame: </span>
        {["3d", "7d", "1m", "3m", "1y"].map((f) => (
          <button key={f} onClick={() => setTimeFrame(f)} className={`time-frame-button ${timeFrame === f ? "active" : ""}`}>
            {f.toUpperCase()}
          </button>
        ))}
      </div>
      {loading && <p>Loading charts...</p>}
      {error && <p>Error: {error}</p>}
      <div className="chart-grid">
        {!loading && !error && charts.map((chart, index) => (
          <div key={index} className="chart-item">
            <h5 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{chart.commodity}</h5>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
              Mean: ${chart.mean?.toFixed(2)} | Std: ${chart.stdDev?.toFixed(2)} | Median: ${chart.median?.toFixed(2)}
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chart.bins} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="x" tick={{ fontSize: 11 }} tickFormatter={v => `$${Number(v).toFixed(1)}`} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [v, 'Count']} labelFormatter={v => `Price: $${Number(v).toFixed(2)}`} />
                <Bar dataKey="y" fill="#0d9488" radius={[2, 2, 0, 0]} />
                <ReferenceLine x={chart.mean} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Mean', fontSize: 11, fill: '#ef4444' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EmpiricalChart;
