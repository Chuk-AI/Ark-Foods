import { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import '../styles/terminalVoilin.css';

const TerminalViolinPlot = () => {
  const [terminalViolinData, setTerminalViolinData] = useState({});

  const fetchTerminalViolinData = async () => {
    try {
      const response = await fetch('/api/terminal_price_violin');
      console.log('Terminal API Response Status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to fetch terminal violin plot data');
      }

      const data = await response.json();
      console.log('Fetched Terminal Data:', data);
      setTerminalViolinData(data);
    } catch (error) {
      console.error('Error fetching terminal violin data:', error);
    }
  };

  useEffect(() => {
    fetchTerminalViolinData();
  }, []);

  return (
    <div id="terminal-violin-plot-section" className="section violin-chart-container">
      <div className="chart-title">
        <h2>Terminal Violin Plots</h2>
      </div>
      {Object.keys(terminalViolinData).length > 0 ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            background: '#33b1a7',
            padding: '20px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            borderRadius:'20px'
          }}
        >
          {/* USDA Violin Chart */}
          {terminalViolinData.USDA && (
            <div
              style={{
                width: '45%',
                padding: '10px',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                borderRadius: '20px', // Individual chart container border radius
                overflow: 'hidden', // Ensures border radius applies to Plot
                background: '#ffffff',
              }}
            >
              <h3 style={{ textAlign: 'center' }}></h3>
              <Plot
                data={[
                  {
                    type: 'violin',
                    x: terminalViolinData.USDA.map(item => item.varietyName),
                    y: terminalViolinData.USDA.map(item => item.price),
                    line: { color: '#1f77b4' }, // Blue color for USDA
                    box: { visible: true },
                    meanline: { visible: true },
                  },
                ]}
                layout={{
                  title: {
                    text: 'USDA Terminal Data',
                    font: { size: 16, weight: 'bold' } // Bold chart title
                  },
                  xaxis: {
                    title: {
                      text: 'Variety',
                      font: { size: 14, weight: 'bold' }, // Bold x-axis title
                      standoff: 6 // Add space between title and tick labels
                    },
                    tickfont: {
                      size: 13, // Font size for x-axis tick labels
                      weight: 500 // Medium-bold for variety names (adjust between 100 and 900)
                    },
                    automargin: true // Automatically adjust margins for the x-axis
                  },
                  yaxis: {
                    title: {
                      text: 'Avg Daily Price',
                      font: { size: 14, weight: 'bold' } // Bold y-axis title
                    },
                    
                    tickfont: {
                      size: 13, // Font size for x-axis tick labels
                      weight: 500 // Medium-bold for variety names (adjust between 100 and 900)
                    },
                    automargin: true // Automatically adjust margins for the y-axis
                  },
                  height: 500,
                  width: 600,
                  margin: { l: 50, r: 60, t: 50, b: 70 }, // Adjust bottom margin for x-axis title
                  autosize: true,
                  plot_bgcolor: '#f0f8ff', // Chart background color
                  paper_bgcolor: 'white' // Outer background color
                }}
                
                style={{
                  borderRadius: '20px', // Apply border radius to Plot
                  overflow: 'hidden', // Ensures Plot respects the border radius
                }}
              />
            </div>
          )}
          {/* ProduceIQ Violin Chart */}
          {terminalViolinData.ProduceIQ && (
            <div
              style={{
                width: '45%',
                padding: '10px',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                borderRadius: '20px', // Individual chart container border radius
                overflow: 'hidden', // Ensures border radius applies to Plot
                background: '#ffffff',
              }}
            >
              <h3 style={{ textAlign: 'center' }}></h3>
              <Plot
                data={[
                  {
                    type: 'violin',
                    x: terminalViolinData.ProduceIQ.map(item => item.varietyName),
                    y: terminalViolinData.ProduceIQ.map(item => item.price),
                    line: { color: '#ff7f0e' }, // Orange color for ProduceIQ
                    box: { visible: true },
                    meanline: { visible: true },
                  },
                ]}
                layout={{
                  title: { 
                    text: 'ProduceIQ Terminal Data', 
                    font: { size: 16, weight: 'bold' } 
                  },
                  xaxis: {
                    title: { 
                      text: 'Variety', 
                      font: { size: 14, weight: 'bold' },
                      standoff: 6, // Proper spacing
                    },
                    
                    tickfont: {
                      size: 13, // Font size for x-axis tick labels
                      weight: 500 // Medium-bold for variety names (adjust between 100 and 900)
                    },
                    automargin: true, // Ensure axis title and tick labels have enough space
                  },
                  yaxis: {
                    title: { 
                      text: 'Avg Daily Price', 
                      font: { size: 14, weight: 'bold' } 
                    },
                    
                    tickfont: {
                      size: 13, // Font size for x-axis tick labels
                      weight: 500 // Medium-bold for variety names (adjust between 100 and 900)
                    },
                    automargin: true, // Ensure margins are calculated automatically
                  },
                  height: 500,
                  width: 600,
                  margin: { l: 50, r: 60, t: 50, b: 70 }, // Adjust bottom margin for x-axis title
                  autosize: true,
                  plot_bgcolor: '#f0f8ff',
                  paper_bgcolor: 'white',
                }}
                
                style={{
                  borderRadius: '20px', // Apply border radius to Plot
                  overflow: 'hidden', // Ensures Plot respects the border radius
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <p style={{ textAlign: 'center', alignContent: 'center' }}>Loading...</p>
      )}
    </div>
  );
};

export default TerminalViolinPlot;
