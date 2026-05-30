import React, { useState } from 'react';
import '../styles/RollingCorrelations.css';

const RollingCorrelation = () => {
  const [series1, setSeries1] = useState('');
  const [series2, setSeries2] = useState('');
  const [window, setWindow] = useState(30);
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState('');
  const [chartType, setChartType] = useState('terminal'); // "terminal" or "shipping"
  const [dataSource, setDataSource] = useState('USDA');   // "USDA" or "ProduceIQ"

  // Example commodity list with "Cubanelles" displayed:
  const commodities = [
    'Anaheim',
    'Cubanelles',  // <-- Shown to the user
    'Fresno',
    'Habanero',
    'Hungarian Wax',
    'Jalapeno',
    'Long Hot',
    'Poblano',
    'Serrano',
    'Shishito'
  ];

  /**
   * Utility function to map "Cubanelles" -> "Cubanelle" if USDA is chosen.
   * Otherwise keep the commodity as is.
   */
  const getCommodityNameForSource = (commodity, source) => {
    // If it’s Cubanelles and the user selected USDA, rename it to Cubanelle
    if (commodity === 'Cubanelles' && source === 'USDA') {
      return 'Cubanelle';
    }
    // Otherwise, keep it the same
    return commodity;
  };

  const fetchRollingCorrelation = async () => {
    setError('');
    setChartData(null);

    if (!series1 || !series2 || series1 === series2) {
      setError('Please select two different commodities.');
      return;
    }

    if (window < 5) {
      setError('Window size must be at least 5 days.');
      return;
    }

    try {
      // Convert user’s chosen commodity names to correct names for the chosen data source
      const finalSeries1 = getCommodityNameForSource(series1, dataSource);
      const finalSeries2 = getCommodityNameForSource(series2, dataSource);

      const endpoint =
        chartType === 'terminal'
          ? '/api/terminal_rolling_correlations'
          : '/api/shipping_rolling_correlations';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          series1: finalSeries1,
          series2: finalSeries2,
          window,
          source: dataSource, // e.g. "USDA" or "ProduceIQ"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'An error occurred.');
        return;
      }

      const data = await response.json();
      setChartData(data);
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    }
  };

  const toggleDataSource = () => {
    setDataSource((prevSource) => (prevSource === 'USDA' ? 'ProduceIQ' : 'USDA'));
  };

  return (
    <div className="rolling-correlation-container">
      <h2>Rolling Correlations</h2>
      <div className="form-container">
        {/* First Commodity */}
        <label>
          First Commodity:
          <select value={series1} onChange={(e) => setSeries1(e.target.value)}>
            <option value="">Select...</option>
            {commodities.map((commodity) => (
              <option key={commodity} value={commodity}>
                {commodity}
              </option>
            ))}
          </select>
        </label>

        {/* Second Commodity */}
        <label>
          Second Commodity:
          <select value={series2} onChange={(e) => setSeries2(e.target.value)}>
            <option value="">Select...</option>
            {commodities.map((commodity) => (
              <option key={commodity} value={commodity}>
                {commodity}
              </option>
            ))}
          </select>
        </label>

        {/* Rolling window */}
        <div className="rolling-window">
          <label>
            Rolling Window (days):
            <input
              type="number"
              min="5"
              value={window}
              onChange={(e) => setWindow(e.target.value)}
            />
          </label>
        </div>

        {/* Chart Type radio: Terminal vs. Shipping */}
        <div className="radio-buttons">
          <label>
            <input
              type="radio"
              value="terminal"
              checked={chartType === 'terminal'}
              onChange={() => setChartType('terminal')}
            />
            Terminal
          </label>
          <label>
            <input
              type="radio"
              value="shipping"
              checked={chartType === 'shipping'}
              onChange={() => setChartType('shipping')}
            />
            Shipping
          </label>
        </div>

        {/* Data Source Toggle (USDA / ProduceIQ) */}
        <div className="slider-switch-container">
          <div className="slider-switch" onClick={toggleDataSource}>
            <div
              className={`slider-switch-thumb ${
                dataSource === 'ProduceIQ' ? 'right' : ''
              }`}
            >
              {dataSource}
            </div>
          </div>
        </div>

        {/* Button to generate chart */}
        <button className="generate-chart-button" onClick={fetchRollingCorrelation}>
          Generate Chart
        </button>
      </div>

      {/* Error message, if any */}
      {error && <div className="error-message">{error}</div>}

      {/* Chart display */}
      <div className="rolling-chart-box">
        {chartData && (
          <div className="rolling-chart-container">
            <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>Chart unavailable</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RollingCorrelation;
