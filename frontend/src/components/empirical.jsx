import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import "../styles/empirical.css";

function EmpiricalChart({ apiEndpoint, title }) {
    const [charts, setCharts] = useState([]); // Updated to handle chart data from backend
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeFrame, setTimeFrame] = useState("7d"); // Default time frame

    // Function to fetch chart data with the selected time frame
    const fetchCharts = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${apiEndpoint}?timeFrame=${timeFrame}`);
            if (!response.ok) throw new Error("Failed to fetch data");
            const result = await response.json();
            setCharts(result); // Directly store backend charts in state
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch charts whenever the time frame changes
    useEffect(() => {
        fetchCharts();
    }, [timeFrame, apiEndpoint]); // Re-fetch when time frame or apiEndpoint changes

    return (
        <div className="empirical-chart-container">
            <h2 className="chart-title">{title} Distribution</h2>
            
            {/* Time Frame Filters */}
            <div className="time-frame-filters">
                <span>Select a time frame: </span>
                {["3d", "7d", "1m", "3m", "1y"].map((frame) => (
                    <button
                        key={frame}
                        onClick={() => setTimeFrame(frame)}
                        className={`time-frame-button ${timeFrame === frame ? "active" : ""}`}
                    >
                        {frame.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Loading State */}
            {loading && <p>Loading charts...</p>}
            {/* Error State */}
            {error && <p>Error: {error}</p>}
            
            <div className="chart-grid">
                {/* Rendering charts */}
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
