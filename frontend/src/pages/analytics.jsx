import React from 'react'
import { useEffect, useState, useRef } from 'react';
import Header from '../components/header';
import Footer from '../components/footer';
import '../styles/analytics.css';
import Plot from 'react-plotly.js';
import EmpiricalChart from '../components/empirical';

export default function DashAnalytics() {

    const [terminalViolinData, setTerminalViolinData] = useState([]);
    const [shippingViolinData, setShippingViolinData] = useState([]);
  
    const [correlationTerminal, setCorrelationTerminal] = useState(null);

  
  
  
    const terminalColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];
    const shippingColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];

    
    const fetchTerminalViolinData = async () => {
        try {
          const response = await fetch('/api/terminal_price_violin');
          console.log('Terminal API Response Status:', response.status);
    
          if (!response.ok) {
            throw new Error('Failed to fetch terminal violin plot data');
          }
    
          const data = await response.json();
          console.log('Fetched Terminal Data:', data); // Log the fetched data
          setTerminalViolinData(data);
        } catch (error) {
          console.error('Error fetching terminal violin data:', error);
        }
      };
    
      useEffect(() => {
        fetchTerminalViolinData();
      }, []);
    
      // Fetch data for the shipping violin plot
      const fetchShippingViolinData = async () => {
        try {
          const response = await fetch('/api/shipping_price_violin');
          console.log('Shipping API Response Status:', response.status);
    
          if (!response.ok) {
            throw new Error('Failed to fetch shipping violin plot data');
          }
    
          const data = await response.json();
          console.log('Fetched Shipping Data:', data); // Log the fetched data
          setShippingViolinData(data);
        } catch (error) {
          console.error('Error fetching shipping violin data:', error);
        }
      };
    
      useEffect(() => {
        fetchShippingViolinData();
      }, []);
    
      // Prepare data for the terminal violin plot
      const TerminalplotData = Object.values(
        terminalViolinData.reduce((acc, item) => {
          const { varietyName, price } = item;
    
          // Ensure unique grouping by varietyName
          if (!acc[varietyName]) {
            acc[varietyName] = {
              type: 'violin',
              y: [], // Initialize prices array
              name: varietyName, // x-axis label
              box: { visible: true },
              meanline: { visible: true },
              marker: { color: '#636efa' },
            };
          }
    
          // Add price to the corresponding variety
          acc[varietyName].y.push(price);
    
          return acc;
        }, {})
      );
    
      // Prepare data for the shipping violin plot
      const ShippingplotData = shippingViolinData.reduce((acc, item) => {
        const { varietyName, price } = item;
        const existingEntry = acc.find((entry) => entry.name === varietyName);
        if (existingEntry) {
          existingEntry.y.push(price);
        } else {
          acc.push({
            type: 'violin',
            y: [price],
            name: varietyName,
            box: { visible: true },
            meanline: { visible: true },
            marker: { color: '#00cc96' }, // Color for shipping plot
          });
        }
        return acc;
      }, []);
    

// Correlation of Terminal market price

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
      console.error("Error fetching correlation matrix:", error);
    });
}, []);

if (!correlationTerminal) return <p>Loading...</p>;

// Prepare data for Plotly
const labels = Object.keys(correlationTerminal); // Extract commodity names
const z = labels.map((row) => labels.map((col) => correlationTerminal[row][col] || 0)); // Build matrix and handle undefined values

    
    
      

  return (
    <div>
        <Header/>

 {/* terminal voilin plot */}
 <div id="terminal-voilin-plot-section" className="section chart-container">
  <div className="chart-title">
    <h2>Terminal Violin Plot</h2>
  </div>
  {terminalViolinData.length > 0 ? (
    <div className="terminal-voilin-wrapper">
      {console.log('Final TerminalplotData:', TerminalplotData)}
      <Plot
        data={TerminalplotData}
        layout={{
          title: 'Terminal Measures of Central Tendency and Dispersion',
          xaxis: { title: 'Variety' },
          yaxis: { title: 'Avg Daily Price' },
          height: 500,
          width: 700, // Set your desired width here
          showlegend: false, // Disable the legend
          margin: { l: 50, r: 50, t: 50, b: 50 }, // Equal left and right margins
          autosize: true,
          plot_bgcolor: '#f0f8ff', // Background color of the plotting area
          paper_bgcolor: '#e6e6fa', // Background color of the entire chart
        }}
      />
    </div>
  ) : (
    <p>Loading...</p>
  )}
</div>

         {/* // Empirical Probability for Terminal prices * */}
        <div className="terminal-empricial-container d-flex">
        <div className=" ">
          <EmpiricalChart
            apiEndpoint="/api/terminal_empricial_probability"
            title="Terminal Empirical Probability"
            colors={terminalColors}
          />
        </div>
      </div>

              {/* shipping voilin plot */}
              <div id="shipping-voilin-plot-section" className="section chart-container">
  <div className="chart-title">
    <h2>Shipping Violin Plot</h2>
  </div>
  {shippingViolinData.length > 0 ? (
    <div className="shipping-voilin-wrapper">
      {console.log('Final ShippingplotData:', ShippingplotData)}
      <Plot
        data={ShippingplotData}
        layout={{
          title: 'Shipping Price Distribution by Commodity',
          xaxis: { title: 'Variety' },
          yaxis: { title: 'Shipping Price' },
          height: 500,
          width: 700, // Set your desired width here
          showlegend: false, // Remove the legend
          margin: { l: 50, r: 50, t: 50, b: 50 }, // Equal left and right margins
          autosize: true,
          plot_bgcolor: '#f0f8ff', // Background color of the plotting area
          paper_bgcolor: '#e6e6fa', // Background color of the entire chart
        }}
      />
    </div>
  ) : (
    <p>Loading...</p>
  )}
</div>

        {/*  Empirical Probability for shipping prices */}
        <div className="shipping-empricial-container d-flex">
        <div >      
          <EmpiricalChart
            apiEndpoint="/api/shipping_empricial_probability"
            title="Shipping Empirical Probability"
            colors={shippingColors}
          />
        </div>
      </div>

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
    width: 800,
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



       <Footer/>
    </div>
  )
}
