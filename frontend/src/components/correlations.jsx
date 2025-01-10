

// import React, { useEffect, useState } from 'react';
// import Plot from 'react-plotly.js';
// import '../styles/RollingCorrelations.css';

// export default function CorrelationsPlots() {
//   const [loading, setLoading] = useState(true);
//   const [terminalChart, setTerminalChart] = useState(null);
//   const [shippingChart, setShippingChart] = useState(null);

//   useEffect(() => {
//     fetch("/api/terminal_correlation")
//       .then((response) => response.json())
//       .then((data) => setTerminalChart(data))
//       .catch((error) =>
//         console.error("Error fetching terminal correlation chart:", error)
//       );

//     fetch("/api/shipping_correlation")
//       .then((response) => response.json())
//       .then((data) => setShippingChart(data))
//       .catch((error) =>
//         console.error("Error fetching shipping correlation chart:", error)
//       )
//       .finally(() => setLoading(false));
//   }, []);

//   if (loading) {
//     return <p>Loading...</p>;
//   }

//   return (
//     <div className="correlations">
//       <h2>Correlations Charts</h2>
//       <div className="corr-section">
//         {terminalChart && (
//           <div className="terminal-corr-section">
//             <Plot data={terminalChart.data} layout={terminalChart.layout} />
//           </div>
//         )}
//         {shippingChart && (
//           <div className="shipping-corr-section">
//             <Plot data={shippingChart.data} layout={shippingChart.layout} />
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


import React, { useEffect, useState, useRef } from 'react';
import Plot from 'react-plotly.js';
import '../styles/RollingCorrelations.css';

export default function CorrelationsPlots() {
  const [isVisible, setIsVisible] = useState(false); // Tracks visibility
  const [loading, setLoading] = useState(false); // Tracks loading state
  const [terminalChart, setTerminalChart] = useState(null); // Stores terminal chart data
  const [shippingChart, setShippingChart] = useState(null); // Stores shipping chart data
  const ref = useRef(); // Ref for IntersectionObserver

  // Detect visibility using IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Stop observing after becoming visible
        }
      },
      { threshold: 0.1 } // Trigger when 10% of the component is visible
    );

    if (ref.current) observer.observe(ref.current);

    return () => {
      if (ref.current) observer.disconnect();
    };
  }, []);

  // Fetch chart data only when the component is visible
  useEffect(() => {
    if (isVisible && !terminalChart && !shippingChart) {
      setLoading(true);
      const fetchTerminalChart = fetch("/api/terminal_correlation")
        .then((response) => response.json())
        .then((data) => setTerminalChart(data))
        .catch((error) =>
          console.error("Error fetching terminal correlation chart:", error)
        );

      const fetchShippingChart = fetch("/api/shipping_correlation")
        .then((response) => response.json())
        .then((data) => setShippingChart(data))
        .catch((error) =>
          console.error("Error fetching shipping correlation chart:", error)
        );

      // Wait for both fetches to complete
      Promise.all([fetchTerminalChart, fetchShippingChart])
        .finally(() => setLoading(false));
    }
  }, [isVisible, terminalChart, shippingChart]);

    // Log only when the component is visible
    useEffect(() => {
      if (isVisible) {
        console.log("correlations chart rendered!");
      }
    }, [isVisible]);
  

  return (
    <div ref={ref} className="correlations">
      <h2>Correlations Charts</h2>
      {loading && <p>Loading...</p>}
      <div className="corr-section">
        {terminalChart && (
          <div className="terminal-corr-section">
            <Plot data={terminalChart.data} layout={terminalChart.layout} />
          </div>
        )}
        {shippingChart && (
          <div className="shipping-corr-section">
            <Plot data={shippingChart.data} layout={shippingChart.layout} />
          </div>
        )}
      </div>
    </div>
  );
}
