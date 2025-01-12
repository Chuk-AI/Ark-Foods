import React from 'react';
import Header from '../components/header';
import Footer from '../components/footer';
import '../styles/analytics.css';
import EmpiricalChart from '../components/empirical';
import CorrelationsPlots from '../components/correlations';
import ScatterPlot from '../components/scatterPlots';
import RollingCorrelation from '../components/RollingCorrelations';
import TerminalViolinPlot from '../components/terminalViolin';
import ShippingViolinPlot from '../components/shippingViolin'; // Import the new component

export default function DashAnalytics() {
  const terminalColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];
  const shippingColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];

  return (
    <div className="analytics-page">
      <Header />

      {/* Terminal Violin Plot */}
      <div>
        <TerminalViolinPlot />
      </div>

   {/* Shipping Violin Plot */}
   <div>
        <ShippingViolinPlot />
      </div>
      
      {/* Empirical Probability for Terminal Prices */}
      <div className="terminal-empricial-container d-flex">
        <div className="">
        <EmpiricalChart
        apiEndpoint="/api/terminal_empricial_probability"
        title="Terminal Empirical Probability"
        colors={terminalColors}
        />
        </div>
      </div>

   

      {/* Empirical Probability for Shipping Prices */}
        <div className="shipping-empricial-container d-flex">
        <div>
        <EmpiricalChart
        apiEndpoint="/api/shipping_empricial_probability"
        title="Shipping Empirical Probability"
        colors={shippingColors}
        />
        </div>
      </div>

      <div className='correlationsHeight'>
        <CorrelationsPlots />
      </div>

      <div>
        <ScatterPlot />
      </div>

      <div>
        <RollingCorrelation />
      </div>

      <Footer />
    </div>
  );
}
