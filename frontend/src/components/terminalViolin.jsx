

// import { useEffect, useState } from "react";
// import Plot from "react-plotly.js";
// import "../styles/terminalVoilin.css";

// const TerminalViolinPlot = () => {
//   const [usdaChart, setUsdaChart] = useState(null);
//   const [produceIqChart, setProduceIqChart] = useState(null);

//   const fetchTerminalViolinPlots = async () => {
//     try {
//       const response = await fetch("/api/terminal_price_violin");
//       if (!response.ok) {
//         throw new Error("Failed to fetch terminal violin plots");
//       }
//       const data = await response.json();
//       setUsdaChart(data.USDA);
//       setProduceIqChart(data.ProduceIQ);
//     } catch (error) {
//       console.error("Error fetching terminal violin plots:", error);
//     }
//   };

//   useEffect(() => {
//     fetchTerminalViolinPlots();
//   }, []);

//   return (
//     <div id="terminal-violin-plot-section" className="section violin-chart-container">
//       <div className="chart-title">
//         <h2>Terminal Violin Plots</h2>
//       </div>
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           background: "#33b1a7",
//           padding: "20px",
//           boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
//           borderRadius: "20px",
//         }}
//       >
//         {/* USDA Violin Chart */}
//         {usdaChart ? (
//           <div
//           >
//             <Plot data={usdaChart.data} layout={usdaChart.layout} />
//           </div>
//         ) : (
//           <p style={{ textAlign: "center", width: "45%", color:'white', fontWeight:'bold' }}>Loading USDA Chart...</p>
//         )}

//         {/* ProduceIQ Violin Chart */}
//         {produceIqChart ? (
//           <div
           
//           >
//             <Plot data={produceIqChart.data} layout={produceIqChart.layout} />
//           </div>
//         ) : (
//           <p style={{ textAlign: "center", width: "45%", color:'white', fontWeight:'bold' }}>Loading ProduceIQ Chart...</p>
//         )}
//       </div>
//     </div>
//   );
// };

// export default TerminalViolinPlot;


import { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import "../styles/terminalViolin.css";

const TerminalViolinPlot = () => {
  const [usdaChart, setUsdaChart] = useState(null);
  const [produceIqChart, setProduceIqChart] = useState(null);
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
      setUsdaChart(data.USDA);
      setProduceIqChart(data.ProduceIQ);
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
    <div id="terminal-violin-plot-section" className="section violin-chart-container">
      <div className="chart-title">
        <h2>Terminal Violin Plots</h2>
      </div>

      {/* Time Frame Filters */}
      <div className="time-frame-filters">
        <span style={{textAlign:'center', display:'flex', alignItems:'center'}}>Select a time frame</span>
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

      {/* Chart Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          background: "#33b1a7",
          padding: "20px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
          borderRadius: "20px",
        }}
      >
        {/* USDA Violin Chart */}
        {loading ? (
          <p style={{ textAlign: "center", width: "45%", color: "white", fontWeight: "bold" }}>
            Loading Charts...
          </p>
        ) : usdaChart ? (
          <div>
            <Plot data={usdaChart.data} layout={usdaChart.layout} />
          </div>
        ) : (
          <p style={{ textAlign: "center", width: "45%", color: "white", fontWeight: "bold" }}>
            No Data for USDA Chart
          </p>
        )}

        {/* ProduceIQ Violin Chart */}
        {loading ? (
          <p style={{ textAlign: "center", width: "45%", color: "white", fontWeight: "bold" }}>
            Loading Charts...
          </p>
        ) : produceIqChart ? (
          <div>
            <Plot data={produceIqChart.data} layout={produceIqChart.layout} />
          </div>
        ) : (
          <p style={{ textAlign: "center", width: "45%", color: "white", fontWeight: "bold" }}>
            No Data for ProduceIQ Chart
          </p>
        )}
      </div>
    </div>
  );
};

export default TerminalViolinPlot;
