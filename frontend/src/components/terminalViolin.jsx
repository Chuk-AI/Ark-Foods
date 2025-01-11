

// import React, { useEffect, useState } from "react";
// import Plot from "react-plotly.js";
// import "../styles/terminalViolin.css";

// const TerminalViolinPlot = () => {
//   const [chartData, setChartData] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [timeFrame, setTimeFrame] = useState("7d"); // Default time frame

//   const fetchTerminalViolinPlots = async (selectedTimeFrame) => {
//     setLoading(true);
//     try {
//       const response = await fetch(`/api/terminal_price_violin?timeFrame=${selectedTimeFrame}`);
//       if (!response.ok) {
//         throw new Error("Failed to fetch terminal violin plot");
//       }
//       const data = await response.json();
//       console.log("Fetched Data:", data);
//       setChartData(data);
//     } catch (error) {
//       console.error("Error fetching terminal violin plot:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchTerminalViolinPlots(timeFrame);
//   }, [timeFrame]);

//   return (
//     <div id="terminal-violin-plot-section" className="section terminal-violin-chart-container">
//       <div className="chart-title">
//         <h2>Terminal Violin Plot</h2>
//       </div>

//       {/* Time Frame Filters */}
//       <div className="time-frame-filters">
//         <span style={{ textAlign: "center", display: "flex", alignItems: "center" }}>
//           Select a time frame
//         </span>
//         {["3d", "7d", "1m", "3m", "1y", "2y"].map((frame) => (
//           <button
//             key={frame}
//             onClick={() => setTimeFrame(frame)}
//             className={`time-frame-button ${timeFrame === frame ? "active" : ""}`}
//           >
//             {frame.toUpperCase()}
//             {timeFrame === frame && <div className="underline"></div>}
//           </button>
//         ))}
//       </div>

//       {/* Chart Section */}
//       {loading ? (
//         <p style={{ textAlign: "center" }}>Loading...</p>
//       ) : chartData ? (
//         <div
//           className="terminal-violin-wrapper"
//           style={{
//             borderRadius: "15px",
//             padding: "20px",
//             backgroundColor: "#33b1a7",
//           }}
//         >
//           <div
//             style={{
//             borderRadius:'20px'
      
//             }}
//           >
//             <Plot
//               data={chartData.data}
//               layout={chartData.layout}
//               style={{ width: "100%", height: "100%" }}
//             />
//           </div>
//         </div>
//       ) : (
//         <p style={{ textAlign: "center" }}>No Data Available</p>
//       )}
//     </div>
//   );
// };

// export default TerminalViolinPlot;




import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import "../styles/terminalViolin.css";

const TerminalViolinPlot = () => {
  const [usdaChartData, setUsdaChartData] = useState(null);
  const [produceiqChartData, setProduceiqChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeFrame, setTimeFrame] = useState("7d"); // Default time frame

  const fetchTerminalViolinPlots = async (selectedTimeFrame) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/terminal_price_violin?timeFrame=${selectedTimeFrame}`);
      if (!response.ok) {
        throw new Error("Failed to fetch terminal violin plots");
      }
      const data = await response.json();
      console.log("Backend Response:", data);
      setUsdaChartData(data.usda);
      setProduceiqChartData(data.produceiq);
    } catch (error) {
      console.error("Error fetching terminal violin plots:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerminalViolinPlots(timeFrame);
  }, [timeFrame]);

  return (
    <div id="terminal-violin-plot-section" className="section terminal-violin-chart-container">
      <div className="chart-title">
        <h2>Terminal Violin Plots</h2>
      </div>

      {/* Time Frame Filters */}
      <div className="time-frame-filters">
        {["3d", "7d", "1m", "3m", "1y", "2y"].map((frame) => (
          <button
            key={frame}
            onClick={() => setTimeFrame(frame)}
            className={`time-frame-button ${timeFrame === frame ? "active" : ""}`}
          >
            {frame.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Chart Row */}

<div className="chart-div">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="chart-row" style={{ display: "flex", justifyContent: "space-between" }}>
          {/* USDA Chart */}
          {usdaChartData && (
          
              <Plot
                data={usdaChartData.data}
                layout={{ ...usdaChartData.layout, width: 600, height: 500 }} // Adjust size here
              />
          )}

          {/* ProduceIQ Chart */}
          {produceiqChartData && (
              <Plot
                data={produceiqChartData.data}
                layout={{ ...produceiqChartData.layout, width: 600, height: 500 }} // Adjust size here
              />
    
          )}
          
        </div>
      )}
      </div>
    </div>
  );
};

export default TerminalViolinPlot;
