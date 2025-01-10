// import React, { useState } from "react";
// import Plot from "react-plotly.js";
// import '../styles/RollingCorrelations.css';

// const RollingCorrelation = () => {
//   const [series1, setSeries1] = useState("");
//   const [series2, setSeries2] = useState("");
//   const [window, setWindow] = useState(30); // Default window size
//   const [chartData, setChartData] = useState(null);
//   const [error, setError] = useState("");
//   const [dataSource, setDataSource] = useState("terminal"); // Default to terminal

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
//   ]; // Replace this with your actual list of commodities

//   const fetchRollingCorrelation = async () => {
//     setError(""); // Clear any previous errors
//     setChartData(null); // Reset chart data

//     if (!series1 || !series2 || series1 === series2) {
//       setError("Please select two different commodities.");
//       return;
//     }

//     if (window < 5) {
//       setError("Window size must be at least 5 days.");
//       return;
//     }

//     try {
//       const endpoint =
//         dataSource === "terminal"
//           ? "/api/terminal_rolling_correlations"
//           : "/api/shipping_rolling_correlations";

//       const response = await fetch(endpoint, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           series1,
//           series2,
//           window,
//         }),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         setError(errorData.error || "An error occurred while fetching data.");
//         return;
//       }

//       const data = await response.json();
//       setChartData(data); // Plotly chart JSON data
//     } catch (err) {
//       setError("An error occurred while fetching data. Please try again.");
//       console.error(err);
//     }
//   };

//   return (
//     <div className="rolling-correlation-container">
//       <h2>Rolling Correlations</h2>

      

//       <div className="form-container">
      
//       <div className="GapInputs">
//           <label>
//             Select First Commodity:
//             <select
//               value={series1}
//               onChange={(e) => setSeries1(e.target.value)}
//             >
//               <option value="">Select...</option>
//               {commodities.map((commodity) => (
//                 <option key={commodity} value={commodity}>
//                   {commodity}
//                 </option>
//               ))}
//             </select>
//           </label>
//         <div  >
//           <label>
//             Select Second Commodity:
//             <select
//               value={series2}
//               onChange={(e) => setSeries2(e.target.value)}
//             >
//               <option value="">Select...</option>
//               {commodities.map((commodity) => (
//                 <option key={commodity} value={commodity}>
//                   {commodity}
//                 </option>
//               ))}
//             </select>
//           </label>
//         </div>
//         </div>

//         <div className="rolling-window">
//           <label>
//             Rolling Window (days):
//             <input
//               type="number"
//               min="5"
//               value={window}
//               onChange={(e) => setWindow(e.target.value)}
//             />
//           </label>
//         </div>
       

  
//         <button onClick={fetchRollingCorrelation} className="rolling-button">Generate Rolling Chart</button>
//       </div>
//       <div className="radio-buttons">
//         <label>
//           <input
//             type="radio"
//             value="terminal"
//             checked={dataSource === "terminal"}
//             onChange={() => setDataSource("terminal")}
//           />
//           Terminal 
//         </label>
//         <label>
//           <input
//             type="radio"
//             value="shipping"
//             checked={dataSource === "shipping"}
//             onChange={() => setDataSource("shipping")}
//           />
//           Shipping 
//         </label>
//       </div>

//       {error && <div className="error-message">{error}</div>}

//       <div className="rolling-chart-container">
//         {chartData && (
//           <Plot
//             data={chartData.data}
//             layout={{
//               ...chartData.layout,
//               height: 500, // Adjust the height
//               width: 600,  // Adjust the width
//               autosize: false, // Disable autosize to enforce dimensions
//             }}
//           />
//         )}
//       </div>
//     </div>
//   );
// };

// export default RollingCorrelation;


import React, { useState } from "react";
import Plot from "react-plotly.js";
import "../styles/RollingCorrelations.css";

const RollingCorrelation = () => {
  const [series1, setSeries1] = useState("");
  const [series2, setSeries2] = useState("");
  const [window, setWindow] = useState(30);
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState("");
  const [dataSource, setDataSource] = useState("terminal");

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
  ];

  const fetchRollingCorrelation = async () => {
    // Reset error and chart data
    setError("");
    setChartData(null);

    if (!series1 || !series2 || series1 === series2) {
      setError("Please select two different commodities.");
      return;
    }

    if (window < 5) {
      setError("Window size must be at least 5 days.");
      return;
    }

    try {
      const endpoint =
        dataSource === "terminal"
          ? "/api/terminal_rolling_correlations"
          : "/api/shipping_rolling_correlations";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          series1,
          series2,
          window,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "An error occurred.");
        return;
      }

      const data = await response.json();
      setChartData(data);
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    }
  };

  return (
    <div className="rolling-correlation-container">
    <h2>Rolling Correlations</h2>
    <div className="form-container">
      {/* First commodity selection */}
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
  
      {/* Second commodity selection */}
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
          <input
            type="number"
            min="5"
            value={window}
            onChange={(e) => setWindow(e.target.value)}
          />
        </label>
      </div>
  
      {/* Data source radio buttons */}
      <div className="radio-buttons">
        <label>
          <input
            type="radio"
            value="terminal"
            checked={dataSource === "terminal"}
            onChange={() => setDataSource("terminal")}
          />
          Terminal
        </label>
        <label>
          <input
            type="radio"
            value="shipping"
            checked={dataSource === "shipping"}
            onChange={() => setDataSource("shipping")}
          />
          Shipping
        </label>
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
