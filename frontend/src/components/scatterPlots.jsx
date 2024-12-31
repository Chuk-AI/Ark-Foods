import React, { useState } from "react";
import Plot from "react-plotly.js";
import '../styles/scatterPlot.css';


function ScatterPlot() {
  const [commodityX, setCommodityX] = useState("");
  const [commodityY, setCommodityY] = useState("");
  const [scatterPlotData, setScatterPlotData] = useState(null);

  const commodities = [
    "Anaheim",
    "Cubanelles",
    "Fresno",
    "Habanero",
    "Hungarian Wax",
    "Jalapeno",
    "Long Hot",
    "Poblano",
    "Serrano",
    "Shishito",
  ]; // Replace with actual commodity list

  const fetchScatterPlot = () => {
    fetch("/api/terminal_scatterplot_matrix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commodity_x: commodityX, commodity_y: commodityY }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          alert(`Error: ${data.error}`);
        } else {
          setScatterPlotData(data);
        }
      })
      .catch((error) => console.error("Error fetching scatter plot:", error));
  };

  return (
    <div className="scatter-container">
      <h2>Scatter Plot Generator</h2>
      <div className="scatter-filter">
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
        <button onClick={fetchScatterPlot} disabled={!commodityX || !commodityY} className="scatter-button">
          Generate Scatter Plot
        </button>
      </div>
      <div className="scatter-chart">
      {scatterPlotData && (
        <Plot data={scatterPlotData.data} layout={scatterPlotData.layout} />
      )}
      </div>
    </div>
  );
}

export default ScatterPlot;
