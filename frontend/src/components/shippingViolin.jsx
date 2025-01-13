
// import React, { useState, useEffect } from "react";
// import Plot from "react-plotly.js";

// export default function ShippingViolinPlot() {
//   const [chartData, setChartData] = useState(null);

//   // Fetch data for the shipping violin plot
//   const fetchShippingViolinData = async () => {
//     try {
//       const response = await fetch("/api/shipping_price_violin");
//       if (!response.ok) {
//         throw new Error("Failed to fetch shipping violin plot data");
//       }
//       const data = await response.json();
//       setChartData(data);
//     } catch (error) {
//       console.error("Error fetching shipping violin data:", error);
//     }
//   };

//   useEffect(() => {
//     fetchShippingViolinData();
//   }, []);


//   useEffect(() => {
//     console.log('Shipping violin rendered!');
//   }, []);

//   return (
//     <div id="shipping-violin-plot-section" className="section violin-chart-container">
//       <div className="chart-title">
//         <h2>Shipping Violin Plot</h2>
//       </div>
//       {chartData ? (
//         <div
//           className="shipping-violin-wrapper"
//           style={{
//             borderRadius: "15px", // Ensure rounded corners for the wrapper
//             padding: "20px", // Add padding inside the wrapper
//             backgroundColor: "#33b1a7", // Background color
//           }}
//         >
//           <div
//             style={{
//               borderRadius: "20px", // Rounded corners for the plot wrapper
//               overflow: "hidden", // Enforces the borderRadius on the plot
//             }}
//           >
//             <Plot
//               data={chartData.data}
//               layout={chartData.layout}
//               style={{
//                 width: "100%",
//                 height: "100%",
//               }}
//             />
//           </div>
//         </div>
//       ) : (
//         <p style={{ textAlign: "center" }}>Loading...</p>
//       )}
//     </div>
//   );
// }


import React, { useState, useEffect } from "react";
import Plot from "react-plotly.js";
import "../styles/shippingViolin.css";


export default function ShippingViolinPlot() {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeFrame, setTimeFrame] = useState("7d"); // Default time frame

  // Fetch data for the shipping violin plot
  const fetchShippingViolinData = async (selectedTimeFrame) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/shipping_price_violin?timeFrame=${selectedTimeFrame}`);
      if (!response.ok) {
        throw new Error("Failed to fetch shipping violin plot data");
      }
      const data = await response.json();
      setChartData(data);
    } catch (error) {
      console.error("Error fetching shipping violin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShippingViolinData(timeFrame);
  }, [timeFrame]);

  return (
    <div id="shipping-violin-plot-section" className="section shipping-violin-chart-container">
      <div className="chart-title">
        <h2>Shipping Violin Plot</h2>
      </div>

      {/* Time Frame Filters */}
      <div className="time-frame-filters">
      <span style={{textAlign:'center', display:'flex', alignItems:'center'}}>Select a time frame</span>

        {["3d", "7d", "1m", "3m", "1y"].map((frame) => (
          <button
            key={frame}
            onClick={() => setTimeFrame(frame)}
            className={`time-frame-button ${timeFrame === frame ? "active" : ""}`}
          >
            {frame.toUpperCase()}
            {timeFrame === frame && <div className="underline"></div>}
          </button>
        ))}
      </div>

      {/* Chart Section */}
      {loading ? (
        <p style={{ textAlign: "center" }}>Loading...</p>
      ) : chartData ? (
        <div
          className="shipping-violin-wrapper"
          style={{
            borderRadius: "15px",
            padding: "20px",
            backgroundColor: "#33b1a7",
          }}
        >
          <div
            style={{
              borderRadius: "20px",
              overflow: "hidden",
              
            }}
          >
           <Plot
  data={chartData.data}
  layout={{
    ...chartData.layout,
    yaxis: {
      ...chartData.layout.yaxis,
      range: [0, Math.max(...chartData.data.flatMap(d => d.y || []))], // Ensure y-axis starts at 0
      title: "Shipping Price", // Add title for clarity
    },
  }}
  style={{
    width: "100%",
    height: "100%",
  }}
/>

          </div>
        </div>
      ) : (
        <p style={{ textAlign: "center" }}>No data available</p>
      )}
    </div>
  );
}
