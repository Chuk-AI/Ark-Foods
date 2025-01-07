import React from 'react'
import { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import '../styles/RollingCorrelations.css'

export default function CorrelationsPlots() {




    const [correlationTerminal, setCorrelationTerminal] = useState(null);
    const [correlationShipping, setCorrelationShipping] = useState(null);


    useEffect(() => {
        // Fetch the correlation matrix from the Flask API
        fetch("/api/terminal_correlation")
          .then((response) => response.json())
          .then((data) => {
            if (data && data.correlation) {
              setCorrelationTerminal(data.correlation); // Only set the correlation data
            } else {
              console.error("Correlation data missing in API response");
            }
          })
          .catch((error) => {
            console.error("Error fetching terminal correlation matrix:", error);
          });
      }, []);
      
      useEffect(() => {
        // Fetch the correlation matrix from the Flask API
        fetch("/api/shipping_correlation")
          .then((response) => response.json())
          .then((data) => {
            if (data && data.correlation) {
              setCorrelationShipping(data.correlation); // Only set the correlation data
            } else {
              console.error("Correlation data missing in API response");
            }
          })
          .catch((error) => {
            console.error("Error fetching shipping correlation matrix:", error);
          });
      }, []);
      
      // Conditional rendering: ensure both datasets are loaded
      if (!correlationTerminal || !correlationShipping) {
        return <p>Loading data...</p>;
      }
      
      // Prepare data for Plotly after the data is ready
      const Termlabels = Object.keys(correlationTerminal); // Extract commodity names
      const terminalZ = Termlabels.map((row) =>
        Termlabels.map((col) => correlationTerminal[row][col] || 0)
      ); // Build matrix and handle undefined values
      
      const labels = Object.keys(correlationShipping); // Extract destination names
      const z = labels.map((row) =>
        labels.map((col) => correlationShipping[row][col] || 0)
      ); // Build matrix and handle undefined values
      

  return (
    <div>
        <div className='correlations'>
      <h2>Correlations Charts</h2>

<div className='corr-section'>
<div className='terminal-corr-section'   style={{
    borderRadius: "15px", // Rounded corners
    overflow: "hidden", // Ensure corners are clipped
  }} >
      <Plot
  data={[
    {
      z: terminalZ,
      x: Termlabels,
      y: Termlabels,
      type: "heatmap",
      colorscale: "CoolWarm",
      showscale: true,
      text: terminalZ.map((row) =>
        row.map((val) => (typeof val === "number" ? val.toFixed(2) : "N/A"))
      ), // Text values for each cell
      hoverinfo: "text", // Show text on hover
    },
  ]}
  layout={{
    title: "Correlation Matrix of Terminal Market Prices",
    xaxis: {
      title: "Pepper types",
      tickangle: -45,
    },
    yaxis: {
      title: "Pepper types",
      automargin: true,
    },
    height: 600,
    width: 600,
    annotations: Termlabels.flatMap((rowLabel, rowIndex) =>
    Termlabels.map((colLabel, colIndex) => ({
        x: colLabel,
        y: rowLabel,
        text: terminalZ[rowIndex][colIndex]?.toFixed(2),
        showarrow: false,
        font: {
          color: "white", // Adjust the color if needed for better contrast
          size: 10,
        },
      }))
    ), // Add annotations for each cell
  }}
/>
</div>

<div className='shipping-corr-section' style={{
    borderRadius: "15px", // Rounded corners
    overflow: "hidden", // Ensure corners are clipped
  }}>
<Plot
        data={[
          {
            z: z,
            x: labels,
            y: labels,
            type: "heatmap",
            colorscale: "CoolWarm",
            showscale: true,
            text: z.map((row) =>
              row.map((val) => (typeof val === "number" ? val.toFixed(2) : "N/A"))
            ), // Text values for each cell
            hoverinfo: "text", // Show text on hover
          },
        ]}
        layout={{
          title: "Correlation Matrix of Shipping Prices",
          xaxis: {
            title: "pepper types",
            tickangle: -45,
          },
          yaxis: {
            title: "pepper types",
            automargin: true,
          },
          height: 600,
          width: 600,
          autosize: true,
   
          annotations: labels.flatMap((rowLabel, rowIndex) =>
            labels.map((colLabel, colIndex) => ({
              x: colLabel,
              y: rowLabel,
              text: z[rowIndex][colIndex]?.toFixed(2),
              showarrow: false,
              font: {
                color: "white", // Adjust the color if needed for better contrast
                size: 10,
              },
            }))
          ), // Add annotations for each cell
        }}
      />
</div>

</div>
</div>
    </div>
  )
}
