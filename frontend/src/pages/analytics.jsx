// import React from 'react';
// import Header from '../components/header';
// import Footer from '../components/footer';
// import '../styles/analytics.css';
// import EmpiricalChart from '../components/empirical';
// import CorrelationsPlots from '../components/correlations';
// import ScatterPlot from '../components/scatterPlots';
// import RollingCorrelation from '../components/RollingCorrelations';
// import TerminalViolinPlot from '../components/terminalViolin';
// import ShippingViolinPlot from '../components/shippingViolin'; // Import the new component

// export default function DashAnalytics() {
//   const terminalColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];
//   const shippingColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];

//   return (
//     <div className="analytics-page">
//       <Header />

//       {/* Terminal Violin Plot */}
//       <div>
//         <TerminalViolinPlot />
//       </div>

//       {/* Empirical Probability for Terminal Prices */}
//       <div className="terminal-empricial-container d-flex">
//         <div className="">
//         <EmpiricalChart
//         apiEndpoint="/api/terminal_empricial_probability"
//         title="Terminal Empirical Probability"
//         colors={terminalColors}
//         />
//         </div>
//       </div>

//       {/* Shipping Violin Plot */}
//       <div>
//         <ShippingViolinPlot />
//       </div>

//       {/* Empirical Probability for Shipping Prices */}
//         <div className="shipping-empricial-container d-flex">
//         <div>
//         <EmpiricalChart
//         apiEndpoint="/api/shipping_empricial_probability"
//         title="Shipping Empirical Probability"
//         colors={shippingColors}
//         />
//         </div>
//       </div>

//       <div className='correlationsHeight'>
//         <CorrelationsPlots />
//       </div>

//       <div>
//         <ScatterPlot />
//       </div>

//       <div>
//         <RollingCorrelation />
//       </div>

//       <Footer />
//     </div>
//   );
// }
import React, { Suspense } from 'react';
import Header from '../components/header';
import Footer from '../components/footer';
import '../styles/analytics.css';
import LazyLoadWrapper from '../components/LazyLoadWrapper';

const EmpiricalChart = React.lazy(() => import('../components/empirical'));
const CorrelationsPlots = React.lazy(() => import('../components/correlations'));
const ScatterPlot = React.lazy(() => import('../components/scatterPlots'));
const RollingCorrelation = React.lazy(() => import('../components/RollingCorrelations'));
const TerminalViolinPlot = React.lazy(() => import('../components/terminalViolin'));
const ShippingViolinPlot = React.lazy(() => import('../components/shippingViolin'));

export default function DashAnalytics() {
  const terminalColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];
  const shippingColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];

  return (
    <div className="analytics-page">
      <Header />

      {/* Terminal Violin Plot */}
      <LazyLoadWrapper>
        <Suspense fallback={<div>Loading Terminal Violin Plot...</div>}>
          <TerminalViolinPlot />
        </Suspense>
      </LazyLoadWrapper>

      {/* Terminal Empirical Chart */}
      <LazyLoadWrapper>
        <Suspense fallback={<div>Loading Terminal Empirical Probability...</div>}>
          <EmpiricalChart
            apiEndpoint="/api/terminal_empricial_probability"
            title="Terminal Empirical Probability"
            colors={terminalColors}
          />
        </Suspense>
      </LazyLoadWrapper>

      {/* Shipping Violin Plot */}
      <LazyLoadWrapper>
        <Suspense fallback={<div>Loading Shipping Violin Plot...</div>}>
          <ShippingViolinPlot />
        </Suspense>
      </LazyLoadWrapper>

      {/* Shipping Empirical Chart */}
      <LazyLoadWrapper>
        <Suspense fallback={<div>Loading Shipping Empirical Probability...</div>}>
          <EmpiricalChart
            apiEndpoint="/api/shipping_empricial_probability"
            title="Shipping Empirical Probability"
            colors={shippingColors}
          />
        </Suspense>
      </LazyLoadWrapper>

      {/* Correlations Plots */}
      <LazyLoadWrapper>
        <Suspense fallback={<div>Loading Correlations Plots...</div>}>
          <CorrelationsPlots />
        </Suspense>
      </LazyLoadWrapper>

      {/* Scatter Plot */}
      <LazyLoadWrapper>
        <Suspense fallback={<div>Loading Scatter Plot...</div>}>
          <ScatterPlot />
        </Suspense>
      </LazyLoadWrapper>

      {/* Rolling Correlation */}
      <LazyLoadWrapper>
        <Suspense fallback={<div>Loading Rolling Correlation...</div>}>
          <RollingCorrelation />
        </Suspense>
      </LazyLoadWrapper>

      <Footer />
    </div>
  );
}
