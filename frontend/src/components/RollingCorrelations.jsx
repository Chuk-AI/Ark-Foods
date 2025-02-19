import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import '../styles/RollingCorrelations.css';

const RollingCorrelation = () => {
  const [series1, setSeries1] = useState('');
  const [series2, setSeries2] = useState('');
  const [window, setWindow] = useState(30);
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState('');
  const [chartType, setChartType] = useState('terminal'); // Terminal or Shipping
  const [dataSource, setDataSource] = useState('USDA'); // Default to USDA

  const commodities = ['Anaheim', 'Cubanelles', 'Fresno', 'Habanero', 'Hungarian Wax', 'Jalapeno', 'Long Hot', 'Poblano', 'Serrano', 'Shishito'];

  const fetchRollingCorrelation = async () => {
    // Reset error and chart data
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
      const endpoint = chartType === 'terminal' ? '/api/terminal_rolling_correlations' : '/api/shipping_rolling_correlations';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          series1,
          series2,
          window,
          source: dataSource, // Include the selected data source
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
        {/* Select chart type: terminal or shipping */}

        {/* Select first commodity */}
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

        {/* Select second commodity */}
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

        {/* Rolling window input */}
        <div className="rolling-window">
          <label>
            Rolling Window (days):
            <input type="number" min="5" value={window} onChange={(e) => setWindow(e.target.value)} />
          </label>
        </div>
        <div className="radio-buttons">
          <label>
            <input type="radio" value="terminal" checked={chartType === 'terminal'} onChange={() => setChartType('terminal')} />
            Terminal
          </label>
          <label>
            <input type="radio" value="shipping" checked={chartType === 'shipping'} onChange={() => setChartType('shipping')} />
            Shipping
          </label>
        </div>

        {/* Data source toggle */}
        <div className="slider-switch-container">
          <div className="slider-switch" onClick={toggleDataSource}>
            <div className={`slider-switch-thumb ${dataSource === 'ProduceIQ' ? 'right' : ''}`}>{dataSource}</div>
          </div>
        </div>

        {/* Generate chart button */}
        <button className="generate-chart-button" onClick={fetchRollingCorrelation}>
          Generate Chart
        </button>
      </div>

      {/* Display errors */}
      {error && <div className="error-message">{error}</div>}

      {/* Render backend-rendered chart */}
      <div className="rolling-chart-box">
        {chartData && (
          <div className="rolling-chart-container">
            <Plot
              data={chartData.data}
              layout={{
                ...chartData.layout,
                responsive: true,
                autosize: true,
              }}
              className="plotly-chart"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default RollingCorrelation;
