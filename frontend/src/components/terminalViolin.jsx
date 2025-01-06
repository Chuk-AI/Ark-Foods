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
    <div id="terminal-violin-plot-section" className="section chart-container">
      <div className="chart-title">
        <h2>Terminal Violin Plots</h2>
      </div>
      {Object.keys(terminalViolinData).length > 0 ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', background:'#e6e6fa', borderRadius: '20px' }}>
          {/* USDA Violin Chart */}
          {terminalViolinData.USDA && (
            <div style={{ width: '45%' }}>
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
                  title: 'USDA Terminal Data',
                  xaxis: { title: 'Variety' },
                  yaxis: { title: 'Avg Daily Price' },
                  height: 500,
                  width: 600,
                  margin: { l: 50, r: 50, t: 50, b: 50 },
                  autosize: true,
                  plot_bgcolor: '#f0f8ff',
                  paper_bgcolor: '#e6e6fa',
                }}
              />
            </div>
          )}
          {/* ProduceIQ Violin Chart */}
          {terminalViolinData.ProduceIQ && (
            <div style={{ width: '45%' }}>
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
                  title: 'ProduceIQ Terminal Data',
                  xaxis: { title: 'Variety' },
                  yaxis: { title: 'Avg Daily Price' },
                  height: 500,
                  width: 600,
                  margin: { l: 50, r: 50, t: 50, b: 50 },
                  autosize: true,
                  plot_bgcolor: '#f0f8ff',
                  paper_bgcolor: '#e6e6fa',
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
