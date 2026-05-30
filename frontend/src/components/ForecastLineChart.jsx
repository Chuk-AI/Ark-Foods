import React, { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import "chartjs-plugin-datalabels";
import "chartjs-adapter-luxon";
import axios from "axios";
import * as XLSX from "xlsx";

const ForecastLineChart = () => {
  const [forecastChart, setForecastChart] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [commoditiesList, setCommoditiesList] = useState([
    "Anaheim",
    "Cubanelles",
    "Fresno",
    "Habanero",
    "Hungarian Wax",
    "Jalapeno",
    "Long Hot",
    "Poblano",
    "Serrano",
    "Shishito",
  ]);

  const [citiesList, setCitiesList] = useState([
    "Baltimore",
    "Boston",
    "Chicago",
    "Columbia",
    "Miami",
    "New York",
    "Philadelphia",
    "Los Angeles",
    "Detroit",
    "Atlanta",
  ]);

  // Forecast Data States
  const [forecastFilterState, setForecastFilterState] = useState({
    commodities: ["Shishito"], // Default to one or more items
    cities: ["Baltimore"], // Default to one or more cities
    averageCities: true, // Changed from averageCommodities to averageCities
    forecastYears: 1, // Default to 1 year of forecasting
    source: "ProduceIQ", // Default data source
  });

  const [appliedForecastFilters, setAppliedForecastFilters] = useState({
    commodities: ["Shishito"],
    cities: ["Baltimore"],
    averageCities: false, // Changed from averageCommodities to averageCities
    forecastYears: 1,
    source: "ProduceIQ", // Default data source
  });

  const forecastChartRef = useRef(null);

  // Helper function to get colors
  const getColor = (index) => {
    const colors = [
      "#FF6384",
      "#36A2EB",
      "#FFCE56",
      "#4BC0C0",
      "#9966FF",
      "#FF9F40",
    ];
    return colors[index % colors.length];
  };

  const handleCheckboxChangeForecast = (e, type) => {
    const value = e.target.value;
    setForecastFilterState((prev) => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter((item) => item !== value)
        : [...prev[type], value],
    }));
  };

  // Handle "Select All" checkbox
  const handleSelectAllForecast = (e, type) => {
    setForecastFilterState((prev) => ({
      ...prev,
      [type]: e.target.checked
        ? type === "commodities"
          ? commoditiesList
          : citiesList
        : [],
    }));
  };

  // Handle Average Cities Change (renamed from handleAverageCommoditiesChange)
  const handleAverageCitiesChange = (e) => {
    setForecastFilterState((prev) => ({
      ...prev,
      averageCities: e.target.checked,
    }));
  };

  // Handle Forecast Years Change
  const handleForecastYearsChange = (e) => {
    setForecastFilterState((prev) => ({
      ...prev,
      forecastYears: parseInt(e.target.value),
    }));
  };

  const updateForecastChart = (chartData) => {
    if (!forecastChartRef.current) {
      console.error("Canvas element not found");
      return;
    }

    const ctx = forecastChartRef.current.getContext("2d");

    if (forecastChart) {
      forecastChart.destroy();
    }

    if (
      !chartData.labels ||
      !chartData.labels.length ||
      !chartData.datasets ||
      !chartData.datasets.length
    ) {
      alert("No forecast data available for the selected criteria.");
      return;
    }

    // Setup datasets with visual styling
    const datasets = chartData.datasets.map((dataset, index) => ({
      ...dataset,
      fill: false,
      tension: 0.1,
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
      spanGaps: true,
      borderColor: dataset.borderColor || getColor(index),
      backgroundColor: dataset.backgroundColor || getColor(index),
      borderDash: dataset.borderDash || [5, 5], // Make forecast lines dashed
    }));

    // Set up background for distinguishing current vs future data
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    // Determine where the forecast starts (after current season)
    const futureStartIndex = 1; // First element after current season

    const newChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: chartData.labels,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            display: true,
            type: "category",
            grid: { display: true, drawBorder: true, color: "#E0E0E0" },
            ticks: {
              display: true,
              maxTicksLimit: 10,
              color: "#666666",
              padding: 10,
              autoSkip: true,
              maxRotation: 45,
              minRotation: 45,
            },
            title: {
              display: true,
              text: "Season",
              color: "#666666",
              padding: { top: 10, bottom: 10 },
            },
            afterDraw: (chart) => {
              if (chart.tooltip._active && chart.tooltip._active.length) {
                const activePoint = chart.tooltip._active[0];
                const ctx = chart.ctx;
                const x = activePoint.element.x;
                const topY = chart.scales.y.top;
                const bottomY = chart.scales.y.bottom;

                // Draw vertical line
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x, topY);
                ctx.lineTo(x, bottomY);
                ctx.lineWidth = 1;
                ctx.strokeStyle = "#FF0000";
                ctx.stroke();
                ctx.restore();
              }
            },
          },
          y: {
            display: true,
            position: "left",
            grid: { display: true, drawBorder: true, color: "#E0E0E0" },
            ticks: {
              display: true,
              color: "#666666",
              padding: 10,
              callback: (value) => `$${value.toFixed(2)}`,
            },
            title: {
              display: true,
              text: "Price ($)",
              color: "#666666",
              padding: { top: 10, bottom: 10 },
            },
          },
        },
        plugins: {
          tooltip: {
            enabled: true,
            mode: "index",
            intersect: false,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            titleColor: "#666666",
            bodyColor: "#666666",
            borderColor: "#E0E0E0",
            borderWidth: 1,
            padding: 10,
            callbacks: {
              title: (context) => context[0].label,
              label: (context) =>
                `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`,
              footer: (context) => {
                const label = context[0].label;
                // Check if this is a forecasted value (any season after current)
                const labelIndex = chartData.labels.indexOf(label);
                if (labelIndex >= futureStartIndex) {
                  return "Forecasted Price";
                }
                return "";
              },
            },
          },
          legend: {
            display: true,
            position: "top",
            align: "center",
            labels: {
              boxWidth: 12,
              padding: 15,
              color: "#666666",
              font: { size: 11 },
            },
          },
          datalabels: {
            display: false, // Globally disable datalabels
          },
          annotation: {
            annotations: {
              line1: {
                type: "line",
                xMin: futureStartIndex - 0.5,
                xMax: futureStartIndex - 0.5,
                borderColor: "rgba(150, 150, 150, 0.5)",
                borderWidth: 2,
                borderDash: [5, 5],
                label: {
                  content: "Forecast Starts",
                  enabled: true,
                  position: "top",
                },
              },
            },
          },
        },
        interaction: { mode: "index", intersect: false },
      },
    });

    setForecastChart(newChart);
  };

  const fetchForecastData = async (filters) => {
    const { commodities, cities, averageCities, forecastYears } = filters;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No token found");

      const response = await axios.get("/api/forecast_line_data", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          commodities: commodities.join(","),
          cities: cities.join(","),
          averageCities: averageCities, // Changed from averageCommodities to averageCities
          forecastYears: forecastYears,
          source: filters.source, // Add this line
        },
      });

      if (response.status !== 200) {
        if (response.status === 401) {
          alert("Session expired. Please log in again.");
          localStorage.removeItem("authToken");
          window.location.href = "/login";
        }
        throw new Error("Failed to fetch forecast data");
      }

      const data = response.data;
      setForecastData(data); // Save data for export
      updateForecastChart(data);
    } catch (error) {
      console.error("Error fetching forecast data:", error);
    }
  };

  const handleDownloadChart = () => {
    if (forecastChart) {
      const canvas = document.getElementById("forecastLineChart");
      const imageLink = document.createElement("a");
      imageLink.download = "forecast_prices_chart.png";
      imageLink.href = canvas.toDataURL("image/png");
      imageLink.click();
    }
  };

  const handleDownloadData = () => {
    if (forecastData) {
      const worksheet = XLSX.utils.json_to_sheet(
        forecastData.labels.map((label, index) => {
          const row = { Season: label };
          forecastData.datasets.forEach((dataset) => {
            row[dataset.label] = dataset.data[index];
          });
          return row;
        }),
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Forecast Prices");
      XLSX.writeFile(workbook, "forecast_prices_data.xlsx");
    }
  };

  const handleDownload = () => {
    handleDownloadChart();
    handleDownloadData();
  };

  useEffect(() => {
    // Initial fetch of data with default filters
    fetchForecastData(appliedForecastFilters);
  }, []);

  const handleApplyForecastFilters = () => {
    setAppliedForecastFilters(forecastFilterState); // Apply current filter state
    fetchForecastData(forecastFilterState); // Fetch data using new filters
  };

  return (
    <div id="forecast-line-section" className="section">
      <div className="row mb-4 salesBody">
        <div className="col-md-3">
          {/* Filter Panel */}
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h3>Forecast Filters</h3>
            </div>
            <div className="card-body" style={{ height: "600px" }}>
              <form id="filters-forecast-data" className="filter-form active">
                {/* Commodity Filter with Checkboxes */}
                <div className="form-group">
                  <label className="font-weight-bold">Commodity</label>
                  <div className="checkbox-container">
                    <label className="select-all">
                      <input
                        type="checkbox"
                        checked={
                          forecastFilterState.commodities.length ===
                          commoditiesList.length
                        }
                        onChange={(e) =>
                          handleSelectAllForecast(e, "commodities")
                        }
                      />
                      Select All
                    </label>

                    {commoditiesList.map((commodity) => (
                      <label key={commodity} className="checkbox-item">
                        <input
                          type="checkbox"
                          value={commodity}
                          checked={forecastFilterState.commodities.includes(
                            commodity,
                          )}
                          onChange={(e) =>
                            handleCheckboxChangeForecast(e, "commodities")
                          }
                        />
                        {commodity}
                      </label>
                    ))}
                  </div>
                </div>

                {/* City Filter with Checkboxes */}
                <div className="form-group">
                  <label className="font-weight-bold">City</label>
                  <div className="checkbox-container">
                    <label className="select-all">
                      <input
                        type="checkbox"
                        checked={
                          forecastFilterState.cities.length ===
                          citiesList.length
                        }
                        onChange={(e) => handleSelectAllForecast(e, "cities")}
                      />
                      Select All
                    </label>

                    {citiesList.map((city) => (
                      <label key={city} className="checkbox-item">
                        <input
                          type="checkbox"
                          value={city}
                          checked={forecastFilterState.cities.includes(city)}
                          onChange={(e) =>
                            handleCheckboxChangeForecast(e, "cities")
                          }
                        />
                        {city}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Average Cities Checkbox (replaced Average Commodities) */}
                <div className="form-group form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="averageCitiesForecast"
                    checked={forecastFilterState.averageCities}
                    onChange={handleAverageCitiesChange}
                  />
                  <label
                    className="form-check-label font-weight-bold"
                    htmlFor="averageCitiesForecast"
                  >
                    Average over Cities
                  </label>
                </div>

                {/* Data Source Selector */}

                {/* Data Source Selector Dropdown */}
                <div className="form-group">
                  <label className="font-weight-bold">Data Source</label>
                  <select
                    className="form-control"
                    value={forecastFilterState.source}
                    onChange={(e) =>
                      setForecastFilterState((prev) => ({
                        ...prev,
                        source: e.target.value,
                      }))
                    }
                  >
                    <option value="ProduceIQ">ProduceIQ</option>
                    <option value="USDA">USDA</option>
                    <option value="ProduceIQ,USDA">Both Sources</option>
                  </select>
                </div>

                {/* Forecast Years Selector */}
                {/* <div className="form-group">
                  <label className="font-weight-bold">Forecast Years</label>
                  <select 
                    className="form-control" 
                    value={forecastFilterState.forecastYears}
                    onChange={handleForecastYearsChange}
                  >
                    <option value="1">1 Year</option>
                 
                  </select>
                </div> */}

                {/* Apply Filters Button */}
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={handleApplyForecastFilters}
                >
                  Apply Filters
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-9">
          {/* Chart Display */}
          <div
            className="card resizable-block"
            id="forecast-line-data-card"
            data-block-title="Forecast Line Data"
          >
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <button
                className="btn btn-sm btn-outline-light toggle-size"
                data-block-title="Forecast Line Data"
                onClick={() =>
                  window.toggleBlockSize &&
                  window.toggleBlockSize(
                    "forecast-line-data-card",
                    "Forecast Line Data",
                  )
                }
              >
                Minimize
              </button>
            </div>
            <div className="card-body" style={{ height: "600px" }}>
              <div
                className="card-body"
                style={{ height: "550px", overflow: "hidden" }}
              >
                <canvas
                  id="forecastLineChart"
                  ref={forecastChartRef}
                  width="400"
                  height="400"
                ></canvas>
              </div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleDownload}>
            Download Chart & Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForecastLineChart;
