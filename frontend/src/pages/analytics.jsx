// import React, { useState } from 'react';
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
//   const [selectedComponent, setSelectedComponent] = useState('Terminal Violin Plot');

//   const terminalColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];
//   const shippingColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];

//   const renderComponent = () => {
//     switch (selectedComponent) {
//       case 'Terminal Violin Plot':
//         return <TerminalViolinPlot />;
//       case 'Shipping Violin Plot':
//         return <ShippingViolinPlot />;
//       case 'Terminal Empirical Probability':
//         return (
//           <EmpiricalChart
//             apiEndpoint="/api/terminal_empricial_probability"
//             title="Terminal Empirical Probability"
//             colors={terminalColors}
//           />
//         );
//       case 'Shipping Empirical Probability':
//         return (
//           <EmpiricalChart
//             apiEndpoint="/api/shipping_empricial_probability"
//             title="Shipping Empirical Probability"
//             colors={shippingColors}
//           />
//         );
//       case 'Correlations Plots':
//         return <CorrelationsPlots />;
//       case 'Scatter Plot':
//         return <ScatterPlot />;
//       case 'Rolling Correlations':
//         return <RollingCorrelation />;
//       default:
//         return <p>Please select a component to display.</p>;
//     }
//   };

//   return (
//     <div className="analytics-page">
//       <Header />

//       {/* Component Selection Dropdown */}
//       <div className="component-selector">
//         <label htmlFor="componentDropdown" style={{ marginRight: '10px' }}>
//           Select Component to Display:
//         </label>
//         <select
//           id="componentDropdown"
//           value={selectedComponent}
//           onChange={(e) => setSelectedComponent(e.target.value)}
//           style={{
//             padding: '10px',
//             borderRadius: '5px',
//             border: '1px solid #ddd',
//           }}
//         >
//           <option value="Terminal Violin Plot">Terminal Violin Plot</option>
//           <option value="Shipping Violin Plot">Shipping Violin Plot</option>
//           <option value="Terminal Empirical Probability">Terminal Empirical Probability</option>
//           <option value="Shipping Empirical Probability">Shipping Empirical Probability</option>
//           <option value="Correlations Plots">Correlations Plots</option>
//           <option value="Scatter Plot">Scatter Plot</option>
//           <option value="Rolling Correlations">Rolling Correlations</option>
//         </select>
//       </div>

//       {/* Render the selected component */}
//       <div className="component-container" style={{ marginTop: '20px' }}>
//         {renderComponent()}
//       </div>

//       <Footer />
//     </div>
//   );
// }


import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
  const [selectedComponent, setSelectedComponent] = useState('Terminal Violin Plot');

  const terminalColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];
  const shippingColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];

  const renderComponent = () => {
    switch (selectedComponent) {
      case 'Terminal Violin Plot':
        return <TerminalViolinPlot />;
      case 'Shipping Violin Plot':
        return <ShippingViolinPlot />;
      case 'Terminal Empirical Probability':
        return (
          <EmpiricalChart
            apiEndpoint="/api/terminal_empricial_probability"
            title="Terminal Empirical Probability"
            colors={terminalColors}
          />
        );
      case 'Shipping Empirical Probability':
        return (
          <EmpiricalChart
            apiEndpoint="/api/shipping_empricial_probability"
            title="Shipping Empirical Probability"
            colors={shippingColors}
          />
        );
      case 'Correlations Plots':
        return <CorrelationsPlots />;
      case 'Scatter Plot':
        return <ScatterPlot />;
      case 'Rolling Correlations':
        return <RollingCorrelation />;
      default:
        return <p>Please select a component to display.</p>;
    }
  };

  const options = [
    { name: 'Terminal Violin Plot', icon: '📊' },
    { name: 'Shipping Violin Plot', icon: '🚢' },
    { name: 'Terminal Empirical Probability', icon: '📈' },
    { name: 'Shipping Empirical Probability', icon: '⚓' },
    { name: 'Correlations Plots', icon: '🔗' },
    { name: 'Scatter Plot', icon: '🔵' },
    { name: 'Rolling Correlations', icon: '🔄' },
  ];

  return (

    <div>
            <Header />

    <div className="analytics-page">

      {/* Fun Card-Based Component Selector */}
      <div className="component-selector">
        <h2>Select a Component to Display:</h2>
        <motion.div
          className="card-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {options.map((option) => (
            <motion.div
              key={option.name}
              className={`selection-card ${selectedComponent === option.name ? 'active' : ''}`}
              onClick={() => setSelectedComponent(option.name)}
              whileHover={{ scale: 1.1, rotate: 3 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.span className="icon" layout>{option.icon}</motion.span>
              <motion.span className="name" layout>{option.name}</motion.span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Render the selected component with a fade-in effect */}
      <motion.div
        className="component-container"
        key={selectedComponent}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{ marginTop: '20px' }}
      >
        {renderComponent()}
      </motion.div>

      <Footer />
    </div>
    </div>
  );
}
