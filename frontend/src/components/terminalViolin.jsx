import React, { useEffect, useState } from 'react';
import '../styles/terminalViolin.css';

const TerminalViolinPlot = () => {
  const [usdaChartData, setUsdaChartData] = useState(null);
  const [produceiqChartData, setProduceiqChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeFrame, setTimeFrame] = useState('7d'); // Default time frame

  const fetchTerminalViolinPlots = async (selectedTimeFrame) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/terminal_price_violin?timeFrame=${selectedTimeFrame}`);
      if (!response.ok) {
        throw new Error('Failed to fetch terminal violin plots');
      }
      const data = await response.json();
      setUsdaChartData(data.usda);
      setProduceiqChartData(data.produceiq);
    } catch (error) {
      console.error('Error fetching terminal violin plots:', error);
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
        <span style={{ textAlign: 'center', display: 'flex', alignItems: 'center' }}>Select a time frame</span>
        {['3d', '7d', '1m', '3m', '1y'].map((frame) => (
          <button key={frame} onClick={() => setTimeFrame(frame)} className={`time-frame-button ${timeFrame === frame ? 'active' : ''}`}>
            {frame.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Chart Row */}

      <div
        className="chart-div"
        style={{
          borderRadius: '15px',
          padding: '20px',
          backgroundColor: '#33b1a7', // Background color remains during loading
          minHeight: '400px', // Ensures height stays consistent while loading
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {loading ? (
          <p style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>Loading...</p>
        ) : (
          <div className="chart-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
            {/* USDA Chart */}
            {usdaChartData && (
              <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>Chart unavailable</div>
            )}

            {/* ProduceIQ Chart */}
            {produceiqChartData && (
              <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>Chart unavailable</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminalViolinPlot;
