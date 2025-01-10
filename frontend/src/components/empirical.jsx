import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import "../styles/empirical.css";

function EmpiricalChart({ apiEndpoint, title }) {
    const [charts, setCharts] = useState([]); // Updated to handle chart data from backend
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCharts = async () => {
            try {
                const response = await fetch(apiEndpoint);
                if (!response.ok) throw new Error("Failed to fetch data");
                const result = await response.json();
                setCharts(result); // Directly store backend charts in state
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCharts();
    }, [apiEndpoint]);

    return (
        <div className="empirical-chart-container">
            <h2 className="chart-title">{title} Distribution</h2>
            {loading && <p>Loading charts...</p>}
            {error && <p>Error: {error}</p>}
            <div className="chart-grid">
                {!loading && !error && charts.map((chart, index) => (
                    <div key={index} className="chart-item">
                        <h5>{chart.commodity}</h5>
                        <Plot
                            data={chart.data} // Use preprocessed data from backend
                            layout={chart.layout} // Use preprocessed layout from backend
                            style={{ width: "100%", height: "100%" }}
                            config={{ responsive: true }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default EmpiricalChart;

