import React, { useEffect, useState } from 'react';
import '../styles/RollingCorrelations.css';

export default function CorrelationsPlots() {
  const [loading, setLoading] = useState(true);
  const [terminalChart, setTerminalChart] = useState(null);
  const [shippingChart, setShippingChart] = useState(null);
  const [source, setSource] = useState('ProduceIQ');

  const fetchCharts = () => {
    setLoading(true);
    fetch(`/api/terminal_correlation?source=${source}`)
      .then((response) => {
        if (!response.ok) {
          console.error('Error in terminal correlation API response:', response.statusText);
          return Promise.reject(response);
        }
        return response.json();
      })
      .then((data) => {
        setTerminalChart(data.chart);
      })
      .catch((error) => {
        console.error('Error fetching terminal correlation chart:', error);
      });

    fetch(`/api/shipping_correlation?source=${source}`)
      .then((response) => {
        if (!response.ok) {
          console.error('Error in shipping correlation API response:', response.statusText);
          return Promise.reject(response);
        }
        return response.json();
      })
      .then((data) => {
        setShippingChart(data.chart);
      })
      .catch((error) => {
        console.error('Error fetching shipping correlation chart:', error);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCharts();
  }, [source]);

  const toggleSource = () => {
    setSource((prevSource) => (prevSource === 'USDA' ? 'ProduceIQ' : 'USDA'));
  };

  const renderHeatmap = (chart, title) => {
    if (!chart || !chart.commodities) return null;
    return (
      <div style={{ overflowX: 'auto', marginBottom: 32 }}>
        <h4 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{title}</h4>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, fontFamily: 'Inter' }}>
          <thead>
            <tr>
              <th style={{ padding: '6px 10px', background: '#f8fafc' }}></th>
              {chart.commodities.map(c => (
                <th key={c} style={{ padding: '6px 10px', background: '#f8fafc', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.commodities.map(rowC => (
              <tr key={rowC}>
                <td style={{ padding: '6px 10px', fontWeight: 600, fontSize: 11, background: '#f8fafc', whiteSpace: 'nowrap' }}>{rowC}</td>
                {chart.commodities.map(colC => {
                  const cell = chart.matrix.find(m => m.row === rowC && m.col === colC);
                  const v = cell ? cell.value : 0;
                  const abs = Math.abs(v);
                  const bg = v > 0
                    ? `rgba(13, 148, 136, ${abs * 0.8})`
                    : `rgba(239, 68, 68, ${abs * 0.8})`;
                  const textColor = abs > 0.5 ? '#fff' : '#0f172a';
                  return (
                    <td key={colC} title={`${rowC} vs ${colC}: ${v}`}
                      style={{ padding: '6px 10px', background: bg, color: textColor, textAlign: 'center', cursor: 'default' }}>
                      {v.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="correlations">
      <h2>Correlations Charts</h2>
      <div className="slider-switch-container">
        <div className="slider-switch" onClick={toggleSource}>
          <div className={`slider-switch-thumb ${source === 'ProduceIQ' ? 'right' : ''}`}>{source}</div>
        </div>
      </div>
      <div className="corr-section">
        {loading ? (
          <p>Loading correlations...</p>
        ) : (
          <>
            <div className="terminal-corr-section">
              {terminalChart ? renderHeatmap(terminalChart, 'Terminal Correlations') : <p>Terminal Correlation unavailable</p>}
            </div>
            <div className="shipping-corr-section">
              {shippingChart ? renderHeatmap(shippingChart, 'Shipping Correlations') : <p>Shipping Correlation unavailable</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
