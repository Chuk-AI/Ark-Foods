import React from 'react'
import { useEffect, useState, useRef } from 'react';
import Header from '../components/header';
import Footer from '../components/footer';
import '../styles/analytics.css';
import Plot from 'react-plotly.js';
import EmpiricalChart from '../components/empirical';
import CorrelationsPlots from '../components/correlations'
import ScatterPlot from '../components/scatterPlots';
import RollingCorrelation from '../components/RollingCorrelations'
import TerminalViolinPlot from '../components/terminalViolin'

export default function DashAnalytics() {

    const [shippingViolinData, setShippingViolinData] = useState([]);
  
  
    const terminalColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];
    const shippingColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];


    

    
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
    <div>
        <Header/>

 {/* terminal voilin plot */}

 <TerminalViolinPlot />


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
    <p style={{textAlign:'center'}}>Loading...</p>
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


<div className='correlations'>
  <CorrelationsPlots />
</div>


<div>
    <ScatterPlot />
</div>

<div>
    <RollingCorrelation />
</div>


       <Footer/>
    </div>
  )
}
