import { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import '../styles/terminalVoilin.css';

const TerminalViolinPlot = () => {
  const [usdaData, setUsdaData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTerminalViolinData = async () => {
    try {
      const response = await fetch('/api/terminal_price_violin');
      console.log('Terminal API Response Status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to fetch terminal violin plot data');
      }

      const data = await response.json();
      console.log('Fetched USDA Data:', data);
      setUsdaData(data.USDA || []);
    } catch (error) {
      console.error('Error fetching terminal violin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerminalViolinData();
  }, []);

  return (
    <div id="terminal-violin-plot-section" className="section violin-chart-container">
      <h2>Terminal Violin Plot</h2>
   
      {loading ? (
        <p style={{ textAlign: 'center', alignContent: 'center' }}>Loading...</p>
      ) : usdaData.length > 0 ? (
        <div
          className="chart-container"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems:'center',
            background: '#33b1a7',
            padding: '20px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            borderRadius: '20px',
          }}
        >
          <div
           
          >
            <Plot
              data={[
                {
                  type: 'violin',
                  x: usdaData.map((item) => item.varietyName),
                  y: usdaData.map((item) => item.price),
                  line: { color: '#1f77b4' },
                  box: { visible: true },
                  meanline: { visible: true },
                },
              ]}
              layout={{
                title: {
                  text: 'USDA Terminal Data',
                  font: { size: 16, weight: 'bold' },
                },
                xaxis: {
                  title: {
                    text: 'Variety',
                    font: { size: 14, weight: 'bold' },
                    standoff: 6,
                  },
                  tickfont: {
                    size: 13,
                    weight: 500,
                  },
                  automargin: true,
                },
                yaxis: {
                  title: {
                    text: 'Avg Daily Price',
                    font: { size: 14, weight: 'bold' },
                  },
                  tickfont: {
                    size: 13,
                    weight: 500,
                  },
                  automargin: true,
                },
                height: 500,
                width: 600,
                margin: { l: 50, r: 60, t: 50, b: 70 },
                autosize: true,
                plot_bgcolor: '#f0f8ff',
                paper_bgcolor: 'white',
              }}
              style={{
                borderRadius: '20px',
                overflow: 'hidden',
              }}
            />
          </div>
        </div>
      ) : (
        <p style={{ textAlign: 'center', alignContent: 'center' }}>
          No data available for USDA source.
        </p>
      )}
    </div>
  );
};

export default TerminalViolinPlot;
