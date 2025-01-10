
// import React, { useState, useEffect } from "react";
// import Plot from "react-plotly.js";

// export default function ShippingViolinPlot() {
//   const [chartData, setChartData] = useState(null);

//   // Fetch data for the shipping violin plot
//   const fetchShippingViolinData = async () => {
//     try {
//       const response = await fetch("/api/shipping_price_violin");
//       if (!response.ok) {
//         throw new Error("Failed to fetch shipping violin plot data");
//       }
//       const data = await response.json();
//       setChartData(data);
//     } catch (error) {
//       console.error("Error fetching shipping violin data:", error);
//     }
//   };

//   useEffect(() => {
//     fetchShippingViolinData();
//   }, []);


//   useEffect(() => {
//     console.log('Shipping violin rendered!');
//   }, []);

//   return (
//     <div id="shipping-violin-plot-section" className="section violin-chart-container">
//       <div className="chart-title">
//         <h2>Shipping Violin Plot</h2>
//       </div>
//       {chartData ? (
//         <div
//           className="shipping-violin-wrapper"
//           style={{
//             borderRadius: "15px", // Ensure rounded corners for the wrapper
//             padding: "20px", // Add padding inside the wrapper
//             backgroundColor: "#33b1a7", // Background color
//           }}
//         >
//           <div
//             style={{
//               borderRadius: "20px", // Rounded corners for the plot wrapper
//               overflow: "hidden", // Enforces the borderRadius on the plot
//             }}
//           >
//             <Plot
//               data={chartData.data}
//               layout={chartData.layout}
//               style={{
//                 width: "100%",
//                 height: "100%",
//               }}
//             />
//           </div>
//         </div>
//       ) : (
//         <p style={{ textAlign: "center" }}>Loading...</p>
//       )}
//     </div>
//   );
// }


import React, { useState, useEffect, useRef } from "react";
import Plot from "react-plotly.js";

export default function ShippingViolinPlot() {
  const [isVisible, setIsVisible] = useState(false);
  const [chartData, setChartData] = useState(null);
  const ref = useRef();

  // Detect if the component is visible in the viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Stop observing once visible
        }
      },
      { threshold: 0.3 } 
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.disconnect();
      }
    };
  }, []);

  // Fetch data only when the component is visible
  useEffect(() => {
    if (isVisible && !chartData) {
      const fetchShippingViolinData = async () => {
        try {
          const response = await fetch("/api/shipping_price_violin");
          if (!response.ok) {
            throw new Error("Failed to fetch shipping violin plot data");
          }
          const data = await response.json();
          setChartData(data);
        } catch (error) {
          console.error("Error fetching shipping violin data:", error);
        }
      };

      fetchShippingViolinData();
    }
  }, [isVisible, chartData]);

  // Log only when the component is visible
  useEffect(() => {
    if (isVisible) {
      console.log("Shipping violin rendered!");
    }
  }, [isVisible]);

  return (
    <div
      id="shipping-violin-plot-section"
      className="section violin-chart-container"
      ref={ref}
    >
      <div className="chart-title">
        <h2>Shipping Violin Plot</h2>
      </div>
      {isVisible && chartData ? (
        <div
          className="shipping-violin-wrapper"
          style={{
            borderRadius: "15px", // Ensure rounded corners for the wrapper
            padding: "20px", // Add padding inside the wrapper
            backgroundColor: "#33b1a7", // Background color
          }}
        >
          <div
            style={{
              borderRadius: "20px", // Rounded corners for the plot wrapper
              overflow: "hidden", // Enforces the borderRadius on the plot
            }}
          >
            <Plot
              data={chartData.data}
              layout={chartData.layout}
              style={{
                width: "100%",
                height: "100%",
              }}
            />
          </div>
        </div>
      ) : (
        <p style={{ textAlign: "center" }}>
          {isVisible ? "Loading..." : null}
        </p>
      )}
    </div>
  );
}
