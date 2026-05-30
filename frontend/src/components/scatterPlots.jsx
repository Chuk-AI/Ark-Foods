import React, { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '../styles/scatterPlot.css';

// Helper function to handle the "Cubanelles" vs "Cubanelle" mismatch
function mapCommodityForSource(commodity, source) {
  if (commodity === 'Cubanelles' && source === 'USDA') {
    return 'Cubanelle';
  }
  if (commodity === 'Cubanelle' && source === 'ProduceIQ') {
    return 'Cubanelles';
  }
  return commodity;
}

function ScatterPlot() {
  const [commodityX, setCommodityX] = useState('');
  const [commodityY, setCommodityY] = useState('');
  const [scatterPlotData, setScatterPlotData] = useState(null);
  const [apiType, setApiType] = useState('terminal'); // 'terminal' or 'shipping'
  const [source, setSource] = useState('ProduceIQ'); // 'USDA' or 'ProduceIQ'

  const commodities = [
    'Anaheim',
    'Cubanelles',
    'Fresno',
    'Habanero',
    'Hungarian Wax',
    'Jalapeno',
    'Long Hot',
    'Poblano',
    'Serrano',
    'Shishito'
  ];

  const fetchScatterPlot = () => {
    const endpoint =
      apiType === 'terminal'
        ? '/api/terminal_scatterplot_matrix'
        : '/api/shipping_scatterplot_matrix';

    const mappedX = mapCommodityForSource(commodityX, source);
    const mappedY = mapCommodityForSource(commodityY, source);

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commodity_x: mappedX,
        commodity_y: mappedY,
        source,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          alert(`Error: ${data.error}`);
        } else {
          setScatterPlotData(data);
        }
      })
      .catch((error) => console.error('Error fetching scatter plot:', error));
  };

  // Toggle between USDA and ProduceIQ
  const toggleSource = () => {
    setSource((prevSource) => (prevSource === 'USDA' ? 'ProduceIQ' : 'USDA'));
  };

  return (
    <div className="scatter-container">
      <h2>Scatter Plot Generator</h2>

      <div className="scatter-filter">
        {/* Commodity X */}
        <label>
          Select first Commodity:
          <select value={commodityX} onChange={(e) => setCommodityX(e.target.value)}>
            <option value="">Select...</option>
            {commodities.map((commodity) => (
              <option key={commodity} value={commodity}>
                {commodity}
              </option>
            ))}
          </select>
        </label>

        {/* Commodity Y */}
        <label>
          Select second Commodity:
          <select value={commodityY} onChange={(e) => setCommodityY(e.target.value)}>
            <option value="">Select...</option>
            {commodities.map((commodity) => (
              <option key={commodity} value={commodity}>
                {commodity}
              </option>
            ))}
          </select>
        </label>

        {/* Radio buttons to choose Terminal or Shipping */}
        <div>
          <label>
            <input
              type="radio"
              value="terminal"
              checked={apiType === 'terminal'}
              onChange={() => setApiType('terminal')}
            />
            Terminal Scatter Plot
          </label>
          <label>
            <input
              type="radio"
              value="shipping"
              checked={apiType === 'shipping'}
              onChange={() => setApiType('shipping')}
            />
            Shipping Scatter Plot
          </label>
        </div>

        {/* Slider switch for data source */}
        <div className="slider-switch-container">
          <div className="slider-switch" onClick={toggleSource}>
            <div className={`slider-switch-thumb ${source === 'ProduceIQ' ? 'right' : ''}`}>
              {source}
            </div>
          </div>
        </div>

        <button
          onClick={fetchScatterPlot}
          disabled={!commodityX || !commodityY}
          className="scatter-button"
        >
          Generate Scatter Plot
        </button>
      </div>

      <div className="scatter-chart-container">
        {scatterPlotData && scatterPlotData.data && scatterPlotData.data[0] && (() => {
          const pts = scatterPlotData.data[0].x.map((x, i) => ({ x, y: scatterPlotData.data[0].y[i] }));
          return (
            <div className="scatter-chart">
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="x"
                    name={commodityX}
                    tick={{ fontSize: 12 }}
                    tickFormatter={v => `$${v}`}
                    label={{ value: `${commodityX} Price`, position: 'insideBottom', offset: -5, fontSize: 12 }}
                  />
                  <YAxis
                    dataKey="y"
                    name={commodityY}
                    tick={{ fontSize: 12 }}
                    tickFormatter={v => `$${v}`}
                    label={{ value: `${commodityY} Price`, angle: -90, position: 'insideLeft', fontSize: 12 }}
                  />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v, n) => [`$${v}`, n]} />
                  <Scatter data={pts} fill="#0d9488" opacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default ScatterPlot;
