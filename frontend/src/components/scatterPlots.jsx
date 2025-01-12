// import React, { useState } from "react";
// import Plot from "react-plotly.js";
// import "../styles/scatterPlot.css";

// function ScatterPlot() {
//   const [commodityX, setCommodityX] = useState("");
//   const [commodityY, setCommodityY] = useState("");
//   const [scatterPlotData, setScatterPlotData] = useState(null);
//   const [apiType, setApiType] = useState("terminal");

//   // Full list of commodities
//   const commodities = [
//     "Anaheim",
//     "Cubanelles",
//     "Fresno",
//     "Habanero",
//     "Hungarian Wax",
//     "Jalapeno",
//     "Long Hot",
//     "Poblano",
//     "Serrano",
//     "Shishito",
//   ]; // Replace with actual commodity list

//   const fetchScatterPlot = () => {
//     const endpoint =
//       apiType === "terminal"
//         ? "/api/terminal_scatterplot_matrix"
//         : "/api/shipping_scatterplot_matrix";

//     fetch(endpoint, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ commodity_x: commodityX, commodity_y: commodityY }),
//     })
//       .then((response) => response.json())
//       .then((data) => {
//         if (data.error) {
//           alert(`Error: ${data.error}`);
//         } else {
//           setScatterPlotData(data);
//         }
//       })
//       .catch((error) => console.error("Error fetching scatter plot:", error));
//   };

//   return (
//     <div className="scatter-container">
//       <h2>Scatter Plot Generator</h2>
//       <div className="scatter-filter">
//         <label>
//           Select first Commodity:
//           <select value={commodityX} onChange={(e) => setCommodityX(e.target.value)}>
//             <option value="">Select...</option>
//             {commodities.map((commodity) => (
//               <option key={commodity} value={commodity}>
//                 {commodity}
//               </option>
//             ))}
//           </select>
//         </label>
//         <label>
//           Select second Commodity:
//           <select value={commodityY} onChange={(e) => setCommodityY(e.target.value)}>
//             <option value="">Select...</option>
//             {commodities.map((commodity) => (
//               <option key={commodity} value={commodity}>
//                 {commodity}
//               </option>
//             ))}
//           </select>
//         </label>
//         <div>
//           <label>
//             <input
//               type="radio"
//               value="terminal"
//               checked={apiType === "terminal"}
//               onChange={() => setApiType("terminal")}
//             />
//             Terminal Scatter Plot
//           </label>
//           <label>
//             <input
//               type="radio"
//               value="shipping"
//               checked={apiType === "shipping"}
//               onChange={() => setApiType("shipping")}
//             />
//             Shipping Scatter Plot
//           </label>
//         </div>
//         <button
//           onClick={fetchScatterPlot}
//           disabled={!commodityX || !commodityY}
//           className="scatter-button"
//         >
//           Generate Scatter Plot
//         </button>
//       </div>

// <div className="scatter-chart-container">
//       {scatterPlotData && (
//         <div className="scatter-chart">
//           <Plot data={scatterPlotData.data} layout={scatterPlotData.layout} />
//         </div>
//       )}
//       </div>
//     </div>
//   );
// }

// export default ScatterPlot;

import React, { useState } from "react";
import Plot from "react-plotly.js";
import "../styles/scatterPlot.css";

function ScatterPlot() {
  const [commodityX, setCommodityX] = useState("");
  const [commodityY, setCommodityY] = useState("");
  const [scatterPlotData, setScatterPlotData] = useState(null);
  const [apiType, setApiType] = useState("terminal"); // Terminal or Shipping
  const [source, setSource] = useState("ProduceIQ"); // USDA or ProduceIQ

  // Full list of commodities
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
    const endpoint =
      apiType === "terminal"
        ? "/api/terminal_scatterplot_matrix"
        : "/api/shipping_scatterplot_matrix";

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commodity_x: commodityX,
        commodity_y: commodityY,
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
      .catch((error) => console.error("Error fetching scatter plot:", error));
  };

  const toggleSource = () => {
    setSource((prevSource) => (prevSource === "USDA" ? "ProduceIQ" : "USDA"));
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
        <div>
          <label>
            <input
              type="radio"
              value="terminal"
              checked={apiType === "terminal"}
              onChange={() => setApiType("terminal")}
            />
            Terminal Scatter Plot
          </label>
          <label>
            <input
              type="radio"
              value="shipping"
              checked={apiType === "shipping"}
              onChange={() => setApiType("shipping")}
            />
            Shipping Scatter Plot
          </label>
        </div>
        <div className="slider-switch-container">
          <div className="slider-switch" onClick={toggleSource}>
            <div className={`slider-switch-thumb ${source === "ProduceIQ" ? "right" : ""}`}>
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
