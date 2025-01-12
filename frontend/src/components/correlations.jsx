

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


import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import '../styles/RollingCorrelations.css';

export default function CorrelationsPlots() {
  const [loading, setLoading] = useState(true);
  const [terminalChart, setTerminalChart] = useState(null);
  const [shippingChart, setShippingChart] = useState(null);

  useEffect(() => {
    console.log("Fetching terminal correlation chart...");
    fetch("/api/terminal_correlation")
      .then((response) => {
        if (!response.ok) {
          console.error("Error in terminal correlation API response:", response.statusText);
          return Promise.reject(response);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Received terminal correlation chart data:", data);
        setTerminalChart(data.chart); // Save only the chart part
      })
      .catch((error) => {
        console.error("Error fetching terminal correlation chart:", error);
      });

    console.log("Fetching shipping correlation chart...");
    fetch("/api/shipping_correlation")
      .then((response) => {
        if (!response.ok) {
          console.error("Error in shipping correlation API response:", response.statusText);
          return Promise.reject(response);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Received shipping correlation chart data:", data);
        setShippingChart(data.chart); // Save only the chart part
      })
      .catch((error) => {
        console.error("Error fetching shipping correlation chart:", error);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="correlations">
      <h2>Correlations Charts</h2>
      <div className="corr-section">
        {terminalChart ? (
          <div className="terminal-corr-section">
            <Plot
              data={terminalChart.data}
              layout={terminalChart.layout}
              onInitialized={(figure) =>
                console.log("Terminal Chart Initialized:", figure)
              }
              onUpdate={(figure) =>
                console.log("Terminal Chart Updated:", figure)
              }
              onError={(err) =>
                console.error("Error rendering Terminal Chart:", err)
              }
            />
          </div>
        ) : (
          <p>Terminal Correlation Loading...</p>
        )}

        {shippingChart ? (
          <div className="shipping-corr-section">
            <Plot
              data={shippingChart.data}
              layout={shippingChart.layout}
              onInitialized={(figure) =>
                console.log("Shipping Chart Initialized:", figure)
              }
              onUpdate={(figure) =>
                console.log("Shipping Chart Updated:", figure)
              }
              onError={(err) =>
                console.error("Error rendering Shipping Chart:", err)
              }
            />
          </div>
        ) : (
          <p>Shipping Correlation Loading...</p>
        )}
      </div>
    </div>
  );
}
