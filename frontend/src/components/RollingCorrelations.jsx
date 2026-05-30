import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
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
    if (commodity === 'Cubanelles' && source === 'USDA') {
      return 'Cubanelle';
    }
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
          source: dataSource,
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
            <h4 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              {chartData.window}-day Rolling Correlation: {chartData.series1} vs {chartData.series2}
            </h4>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart
                data={chartData.dates.map((d, i) => ({ date: d, correlation: chartData.values[i] }))}
                margin={{ top: 8, right: 16, left: 0, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fontFamily: 'Inter' }}
                  angle={-35}
                  textAnchor="end"
                  interval={Math.max(1, Math.floor(chartData.dates.length / 8))}
                />
                <YAxis
                  domain={[-1, 1]}
                  tick={{ fontSize: 11, fontFamily: 'Inter' }}
                  tickFormatter={v => v.toFixed(2)}
                />
                <Tooltip formatter={(v) => [v.toFixed(4), 'Correlation']} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="correlation" stroke="#0d9488" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default RollingCorrelation;
