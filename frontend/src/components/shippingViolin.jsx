import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

export default function ShippingViolinPlot() {
  const [shippingViolinData, setShippingViolinData] = useState([]);

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

  return (
    <div id="shipping-violin-plot-section" className="section violin-chart-container">
      <div className="chart-title">
        <h2>Shipping Violin Plot</h2>
      </div>
      {shippingViolinData.length > 0 ? (
        <div
          className="shipping-violin-wrapper"
          style={{
            borderRadius: '15px', // Ensure rounded corners for the wrapper
            padding: '20px', // Add padding inside the wrapper
            backgroundColor: '#33b1a7', // Background color
          }}
        >
          {console.log('Final ShippingplotData:', ShippingplotData)}
          <div
            style={{
              borderRadius: '20px', // Rounded corners for the plot wrapper
              overflow: 'hidden', // Enforces the borderRadius on the plot
            }}
          >
            <Plot
              data={ShippingplotData}
              layout={{
                title: 'Shipping Price Distribution by Commodity',
                xaxis: { title: 'Variety' },
                yaxis: { title: 'Shipping Price' },
                height: 500,
                width: 700, // Set your desired width
                showlegend: false,
                margin: { l: 50, r: 50, t: 50, b: 50 }, // Internal chart margins
                autosize: true,
                plot_bgcolor: '#f0f8ff', // Chart background color
                paper_bgcolor: 'white', // Outer background color
              }}
              style={{
                width: '100%',
                height: '100%',
              }}
            />
          </div>
        </div>
      ) : (
        <p style={{ textAlign: 'center' }}>Loading...</p>
      )}
    </div>
  );
}
