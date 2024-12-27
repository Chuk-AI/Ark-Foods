import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import '../styles/empirical.css'

function EmpiricalChart({ apiEndpoint, title, colors }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(apiEndpoint);
        if (!response.ok) throw new Error("Failed to fetch data");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [apiEndpoint]);

  if (loading) return <p>Loading {title} charts...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="chart-container">
      <h1 className="chart-title">{title} Distribution</h1>
      {/* Use CSS classes for layout */}
      <div className="chart-grid">
        {data.map((item, index) => (
          <div key={index} className="chart-item">
            <h3>{item.commodity}</h3>
            <Plot
              data={[
                {
                  x: item.histogram.x,
                  y: item.histogram.y,
                  type: "bar",
                  name: item.commodity,
                  marker: { color: colors[index % colors.length] }, // Dynamic colors
                  opacity: 0.75,
                },
                {
                  x: [item.mean, item.mean],
                  y: [0, Math.max(...item.histogram.y)],
                  type: "scatter",
                  mode: "lines",
                  line: { color: "red", dash: "dash" },
                  name: "Mean",
                },
                {
                  x: [item.mean - item.std_dev, item.mean + item.std_dev],
                  y: [0, 0],
                  type: "scatter",
                  mode: "markers",
                  marker: { color: "blue", size: 8, symbol: "cross" },
                  name: "Std Dev",
                },
              ]}
              layout={{
                title: `Distribution of ${item.commodity}`,
                xaxis: { title: "Price" },
                yaxis: { title: "Frequency" },
                showlegend: true,
                height: 400,
                width: 400,
              }}
              config={{ responsive: true }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default EmpiricalChart;
