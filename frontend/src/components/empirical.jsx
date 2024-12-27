// import React, { useEffect, useState, useRef } from "react";
// import Chart from "chart.js/auto";

// function EmpiricalChart({ apiEndpoint, colors, chartRefs, title }) {
//   const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // Maintain chart instances
//   const chartInstances = useRef([]);

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const response = await fetch(apiEndpoint);
//         if (!response.ok) throw new Error("Failed to fetch data");
//         const result = await response.json();
//         setData(result);
//       } catch (err) {
//         setError(err.message);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, [apiEndpoint]);

//   useEffect(() => {
//     if (!loading && data.length > 0) {
//       data.forEach((item, index) => {
//         const ctx = chartRefs.current[index].getContext("2d");

//         // Destroy any existing chart instance on this canvas
//         if (chartInstances.current[index]) {
//           chartInstances.current[index].destroy();
//         }

//         // Create new chart
//         const mean = item.mean;
//         const std_dev = item.std_dev;

//         chartInstances.current[index] = new Chart(ctx, {
//           type: "bar",
//           data: {
//             labels: item.price,
//             datasets: [
//               {
//                 label: `${item.commodity} Price Distribution`,
//                 data: item.price.map(() => 1),
//                 backgroundColor: colors[index % colors.length],
//               },
//               {
//                 label: "Mean",
//                 data: [mean],
//                 type: "line",
//                 borderColor: "red",
//                 borderDash: [5, 5],
//                 pointRadius: 5,
//               },
//               {
//                 label: "Std Dev",
//                 data: [mean - std_dev, mean + std_dev],
//                 type: "scatter",
//                 pointBackgroundColor: "blue",
//                 pointRadius: 8,
//               },
//             ],
//           },
//           options: {
//             responsive: true,
//             plugins: { legend: { display: true } },
//             scales: {
//               x: { title: { display: true, text: "Price" } },
//               y: { title: { display: true, text: "Frequency" } },
//             },
//           },
//         });
//       });
//     }

//     // Cleanup on unmount
//     return () => {
//       chartInstances.current.forEach((chart) => {
//         if (chart) chart.destroy();
//       });
//     };
//   }, [data, loading, chartRefs, colors]);

//   if (loading) return <p>Loading {title.toLowerCase()} charts...</p>;
//   if (error) return <p>Error: {error}</p>;

//   return (
//     <div>
//       <h1>{title} Distribution</h1>
//       <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-around" }}>
//         {data.map((item, index) => (
//           <div key={index} style={{ margin: "20px", width: "400px" }}>
//             <h3>{item.commodity}</h3>
//             <canvas ref={(el) => (chartRefs.current[index] = el)} width="400" height="400"></canvas>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// export default EmpiricalChart;
