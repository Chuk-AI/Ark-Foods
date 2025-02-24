import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import '../styles/scatterPlot.css';

// Helper function to handle the "Cubanelles" vs "Cubanelle" mismatch
function mapCommodityForSource(commodity, source) {
  // If user selected "Cubanelles" but source is USDA, change to "Cubanelle"
  if (commodity === 'Cubanelles' && source === 'USDA') {
    return 'Cubanelle';
  }
  // If user selected "Cubanelle" but source is ProduceIQ, switch to "Cubanelles" 
  // (Only do this if you need the reverse scenario. Otherwise, omit it.)
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

  // Commodity list includes "Cubanelles" (with 's')
  // so the user can pick it in the dropdown.
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
    // Determine which endpoint to call
    const endpoint =
      apiType === 'terminal'
        ? '/api/terminal_scatterplot_matrix'
        : '/api/shipping_scatterplot_matrix';

    // Map commodities based on the data source
    const mappedX = mapCommodityForSource(commodityX, source);
    const mappedY = mapCommodityForSource(commodityY, source);

    // Make the request
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
        {scatterPlotData && (
          <div className="scatter-chart">
            <Plot data={scatterPlotData.data} layout={scatterPlotData.layout} />
          </div>
        )}
      </div>
    </div>
  );
}

export default ScatterPlot;
