import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import '../styles/empirical.css';

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

    return (
        <div className="empirical-chart-container">
            <h2 className="chart-title">{title} Distribution</h2> {/* Title always visible */}
            {loading && <p>Loading charts...</p>} {/* Loading message */}
            {error && <p>Error: {error}</p>} {/* Error message */}
            <div className="chart-grid">
                {!loading && !error && data.map((item, index) => (
                    <div key={index} className="chart-item">
                        <h5>{item.commodity}</h5>
                        <Plot
                            data={[
                                {
                                    x: item.histogram.x,
                                    y: item.histogram.y,
                                    type: "bar",
                                    name: item.commodity,
                                    marker: { color: colors[index % colors.length] },
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
                                xaxis: { title: "Price" },
                                yaxis: { title: "Frequency" },
                                showlegend: false,
                                height: 400,
                                width: 370,
                                plot_bgcolor: "#f0f8ff",
                                paper_bgcolor: "white",
                                margin: { l: 60, r: 10, t: 20, b: 50 },
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
