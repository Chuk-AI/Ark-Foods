import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import '../styles/RollingCorrelations.css';

export default function CorrelationsPlots() {
  const [loading, setLoading] = useState(true);
  const [terminalChart, setTerminalChart] = useState(null);
  const [shippingChart, setShippingChart] = useState(null);
  const [source, setSource] = useState('ProduceIQ'); // Track current source

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
        setTerminalChart(data.chart); // Save only the chart part
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
        setShippingChart(data.chart); // Save only the chart part
      })
      .catch((error) => {
        console.error('Error fetching shipping correlation chart:', error);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCharts(); // Fetch data on initial load and whenever the source changes
  }, [source]);

  const toggleSource = () => {
    setSource((prevSource) => (prevSource === 'USDA' ? 'ProduceIQ' : 'USDA'));
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
        {terminalChart ? (
          <div className="terminal-corr-section">
            <Plot data={terminalChart.data} layout={terminalChart.layout} onError={(err) => console.error('Error rendering Terminal Chart:', err)} />
          </div>
        ) : (
          <p>Terminal Correlation Loading...</p>
        )}

        {shippingChart ? (
          <div className="shipping-corr-section">
            <Plot data={shippingChart.data} layout={shippingChart.layout} onError={(err) => console.error('Error rendering Shipping Chart:', err)} />
          </div>
        ) : (
          <p>Shipping Correlation Loading...</p>
        )}
      </div>
    </div>
  );
}
