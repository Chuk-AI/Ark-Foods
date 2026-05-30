import React, { useState, useEffect } from 'react';
import '../styles/shippingViolin.css';

export default function ShippingViolinPlot() {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeFrame, setTimeFrame] = useState('7d'); // Default time frame

  // Fetch data for the shipping violin plot
  const fetchShippingViolinData = async (selectedTimeFrame) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/shipping_price_violin?timeFrame=${selectedTimeFrame}`);
      if (!response.ok) {
        throw new Error('Failed to fetch shipping violin plot data');
      }
      const data = await response.json();
      setChartData(data);
    } catch (error) {
      console.error('Error fetching shipping violin data:', error);
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
        <span style={{ textAlign: 'center', display: 'flex', alignItems: 'center' }}>Select a time frame</span>

        {['3d', '7d', '1m', '3m', '1y'].map((frame) => (
          <button key={frame} onClick={() => setTimeFrame(frame)} className={`time-frame-button ${timeFrame === frame ? 'active' : ''}`}>
            {frame.toUpperCase()}
            {timeFrame === frame && <div className="underline"></div>}
          </button>
        ))}
      </div>

      {/* Chart Section */}
      <div
        className="shipping-violin-wrapper"
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
        ) : chartData ? (
          <div
            style={{
              borderRadius: '20px',
              overflow: 'hidden',
              width: '100%',
              height: '100%',
            }}
          >
            <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>Chart unavailable</div>
          </div>
        ) : (
          <p style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>No data available</p>
        )}
      </div>
    </div>
  );
}
