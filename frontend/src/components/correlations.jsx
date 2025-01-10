

import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import '../styles/RollingCorrelations.css';

export default function CorrelationsPlots() {
  const [loading, setLoading] = useState(true);
  const [terminalChart, setTerminalChart] = useState(null);
  const [shippingChart, setShippingChart] = useState(null);

  useEffect(() => {
    fetch("/api/terminal_correlation")
      .then((response) => response.json())
      .then((data) => setTerminalChart(data))
      .catch((error) =>
        console.error("Error fetching terminal correlation chart:", error)
      );

    fetch("/api/shipping_correlation")
      .then((response) => response.json())
      .then((data) => setShippingChart(data))
      .catch((error) =>
        console.error("Error fetching shipping correlation chart:", error)
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="correlations">
      <h2>Correlations Charts</h2>
      <div className="corr-section">
        {terminalChart && (
          <div className="terminal-corr-section">
            <Plot data={terminalChart.data} layout={terminalChart.layout} />
          </div>
        )}
        {shippingChart && (
          <div className="shipping-corr-section">
            <Plot data={shippingChart.data} layout={shippingChart.layout} />
          </div>
        )}
      </div>
    </div>
  );
}

