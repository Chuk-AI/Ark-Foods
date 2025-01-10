// import React from 'react'
// import { useEffect, useState } from 'react';
// import Plot from 'react-plotly.js';
// import '../styles/RollingCorrelations.css'

// export default function CorrelationsPlots() {


//   const [loading, setLoading] = useState(true); // Add a loading state


//     const [correlationTerminal, setCorrelationTerminal] = useState(null);
//     const [correlationShipping, setCorrelationShipping] = useState(null);


//     useEffect(() => {
//         // Fetch the correlation matrix from the Flask API
//         fetch("/api/terminal_correlation")
//           .then((response) => response.json())
//           .then((data) => {
//             if (data && data.correlation) {
//               setCorrelationTerminal(data.correlation); // Only set the correlation data
//             } else {
//               console.error("Correlation data missing in API response");
//             }
//           })
//           .catch((error) => {
//             console.error("Error fetching terminal correlation matrix:", error);
//           });
//       }, []);
      
//       useEffect(() => {
//         // Fetch the correlation matrix from the Flask API
//         fetch("/api/shipping_correlation")
//           .then((response) => response.json())
//           .then((data) => {
//             if (data && data.correlation) {
//               setCorrelationShipping(data.correlation); // Only set the correlation data
//             } else {
//               console.error("Correlation data missing in API response");
//             }
//           })
//           .catch((error) => {
//             console.error("Error fetching shipping correlation matrix:", error);
//           })
//           .finally(() => setLoading(false)); // Set loading to false after data is fetched

//           ;
//       }, []);
      
//       // // Conditional rendering: ensure both datasets are loaded
//       // if (!correlationTerminal || !correlationShipping) {
//       //   return <p>Loading data...</p>;
//       // }
      
//       // Prepare data for Plotly after the data is ready
//       const Termlabels = correlationTerminal ? Object.keys(correlationTerminal) : [];
//       const terminalZ = correlationTerminal
//         ? Termlabels.map((row) =>
//             Termlabels.map((col) => correlationTerminal[row][col] || 0)
//           )
//         : [];
      
//       const labels = correlationShipping ? Object.keys(correlationShipping) : [];
//       const z = correlationShipping
//         ? labels.map((row) =>
//             labels.map((col) => correlationShipping[row][col] || 0)
//           )
//         : [];
      
      

//   return (
//     <div>
//         <div className='correlations'>
//       <h2>Correlations Charts</h2>

//       {loading ? (
//           <p>Loading...</p> 
//         ) : (
// <div className='corr-section'>
// <div className='terminal-corr-section'   style={{
//     borderRadius: "15px", // Rounded corners
//     overflow: "hidden", // Ensure corners are clipped
//   }} >
//       <Plot
//   data={[
//     {
//       z: terminalZ,
//       x: Termlabels,
//       y: Termlabels,
//       type: "heatmap",
//       colorscale: "CoolWarm",
//       showscale: true,
//       text: terminalZ.map((row) =>
//         row.map((val) => (typeof val === "number" ? val.toFixed(2) : "N/A"))
//       ), // Text values for each cell
//       hoverinfo: "text", // Show text on hover
//     },
//   ]}
//   layout={{
//     title: { 
//       text: 'Correlation Matrix of Terminal Market Prices', 
//       font: { size: 16, weight: 'bold' } // Bold title
//     },
//     xaxis: {
//       title: {
//         text: "Pepper types",
//         font: { size: 17, weight: 500 }, // Font styling for the x-axis title
//         standoff: 6, // Add space between the title and tick labels
//       },
//       tickfont: {
//         size: 12, // Font size for x-axis tick labels
//         weight: 600, // Normal weight for x-axis tick labels
//       },
//       tickangle: -45, // Rotate x-axis tick labels
//       automargin: true, // Automatically adjust margins for the x-axis
//     },
//     yaxis: {
//       title: {
//         text: "Pepper types",
//         font: { size: 17, weight: 500 }, // Font styling for the y-axis title
//         standoff: 8, // Add space between the title and tick labels
//       },
//       tickfont: {
//         size: 12, // Font size for y-axis tick labels
//         weight: 600, // Normal weight for y-axis tick labels
//       },
//       automargin: true, // Automatically adjust margins for the y-axis
//     },
//     height: 600,
//     width: 600,
//     autosize: true,
//     annotations: Termlabels.flatMap((rowLabel, rowIndex) =>
//       Termlabels.map((colLabel, colIndex) => ({
//         x: colLabel,
//         y: rowLabel,
//         text: terminalZ[rowIndex][colIndex]?.toFixed(2),
//         showarrow: false,
//         font: {
//           color: "white", // Adjust the color if needed for better contrast
//           size: 10,
//         },
//       }))
//     ), // Add annotations for each cell
//   }}
  
// />
// </div>

// <div className='shipping-corr-section' style={{
//     borderRadius: "15px", // Rounded corners
//     overflow: "hidden", // Ensure corners are clipped
//   }}>
// <Plot
//         data={[
//           {
//             z: z,
//             x: labels,
//             y: labels,
//             type: "heatmap",
//             colorscale: "CoolWarm",
//             showscale: true,
//             text: z.map((row) =>
//               row.map((val) => (typeof val === "number" ? val.toFixed(2) : "N/A"))
//             ), // Text values for each cell
//             hoverinfo: "text", // Show text on hover
//           },
//         ]}
//         layout={{
          
//           title: { 
//             text: 'Correlation Matrix of Shipping Prices', 
//             font: { size: 16, weight: 'bold' } // Bold title
//           },
//           xaxis: {
//             title: {
//               text: "pepper types",
//               font: { size: 17, weight: 500 }, // Font styling for the y-axis title
//               standoff: 6, // Add space between the title and tick labels
//             },
//             tickfont: {
//               size: 12, // Font size for x-axis tick labels
//               weight: 600, // Normal weight for x-axis tick labels
//             },
//             tickangle: -45, // Rotate x-axis tick labels
//             automargin: true, // Automatically adjust margins for the x-axis
//           },
//           yaxis: {
//             title: {
//               text: "pepper types",
//               font: { size: 17, weight: 500 }, // Font styling for the y-axis title
//               standoff: 8, // Add space between the title and tick labels
//             },
//             tickfont: {
//               size: 12, // Font size for y-axis tick labels
//               weight: 600, // Normal weight for y-axis tick labels
//             },
//             automargin: true, // Automatically adjust margins for the y-axis
//           },
//           height: 600,
//           width: 600,
//           autosize: true,
//           annotations: labels.flatMap((rowLabel, rowIndex) =>
//             labels.map((colLabel, colIndex) => ({
//               x: colLabel,
//               y: rowLabel,
//               text: z[rowIndex][colIndex]?.toFixed(2),
//               showarrow: false,
//               font: {
//                 color: "white", // Adjust the color if needed for better contrast
//                 size: 10,
//               },
//             }))
//           ), // Add annotations for each cell
//         }}
        
//       />
// </div>

// </div>
//         )}
// </div>
//     </div>
//   );
// }


import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import '../styles/RollingCorrelations.css';

export default function CorrelationsPlots() {
  const [loading, setLoading] = useState(true);
  const [terminalChart, setTerminalChart] = useState(null);
  const [shippingChart, setShippingChart] = useState(null);

  useEffect(() => {
    fetch("/api/terminal_correlation")
      .then((response) => response.json())
      .then((data) => setTerminalChart(data))
      .catch((error) =>
        console.error("Error fetching terminal correlation chart:", error)
      );

    fetch("/api/shipping_correlation")
      .then((response) => response.json())
      .then((data) => setShippingChart(data))
      .catch((error) =>
        console.error("Error fetching shipping correlation chart:", error)
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="correlations">
      <h2>Correlations Charts</h2>
      <div className="corr-section">
        {terminalChart && (
          <div className="terminal-corr-section">
            <Plot data={terminalChart.data} layout={terminalChart.layout} />
          </div>
        )}
        {shippingChart && (
          <div className="shipping-corr-section">
            <Plot data={shippingChart.data} layout={shippingChart.layout} />
          </div>
        )}
      </div>
    </div>
  );
}
