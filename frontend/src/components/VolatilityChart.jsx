import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import axios from 'axios';
import * as XLSX from 'xlsx';

const VolatilityChart = () => {
  const [volatilityChart, setVolatilityChart] = useState(null);
  const [volatilityData, setVolatilityData] = useState(null);
  const [commoditiesList, setCommoditiesList] = useState([
    'Anaheim', 'Cubanelles', 'Jalapeno', 'Poblano', 'Serrano', 'Shishito'
  ]);
  
  const [citiesList, setCitiesList] = useState([
    "Baltimore", "Boston", "Chicago", "Columbia", "Miami", "New York", "Philadelphia", "Los Angeles"
  ]);
  
  // Volatility Data States
  const [volatilityFilterState, setVolatilityFilterState] = useState({
    commodities: ['Shishito'], // Default to one commodity
    cities: ['Baltimore'], // Default to one city
    years: [new Date().getFullYear() - 1], // Default to last year
    displayType: 'monthly' // 'monthly' or 'seasonal'
  });

  const [appliedVolatilityFilters, setAppliedVolatilityFilters] = useState({
    commodities: ['Shishito'],
    cities: ['Baltimore'],
    years: [new Date().getFullYear() - 1],
    displayType: 'monthly'
  });

  const volatilityChartRef = useRef(null);

  // Helper function to get colors
  const getColor = (index) => {
    const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];
    return colors[index % colors.length];
  };

  // Handle checkbox changes
  const handleCheckboxChange = (e, type) => {
    const value = e.target.value;
    setVolatilityFilterState((prev) => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter((item) => item !== value)
        : [...prev[type], value],
    }));
  };
  
  // Handle "Select All" checkbox
  const handleSelectAll = (e, type) => {
    setVolatilityFilterState((prev) => ({
      ...prev,
      [type]: e.target.checked 
        ? (type === 'commodities' ? commoditiesList : type === 'cities' ? citiesList : prev[type]) 
        : [],
    }));
  };

  // Handle Display Type Change
  const handleDisplayTypeChange = (e) => {
    setVolatilityFilterState((prev) => ({
      ...prev,
      displayType: e.target.value,
    }));
  };

  // Get years for selection (last 5 years)
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }
    return years;
  };

  // Handle year selection
  const handleYearChange = (e) => {
    const value = parseInt(e.target.value);
    setVolatilityFilterState((prev) => ({
      ...prev,
      years: prev.years.includes(value)
        ? prev.years.filter((y) => y !== value)
        : [...prev.years, value],
    }));
  };

  const updateVolatilityChart = (chartData) => {
    if (!volatilityChartRef.current) {
      console.error('Canvas element not found');
      return;
    }

    const ctx = volatilityChartRef.current.getContext('2d');

    if (volatilityChart) {
      volatilityChart.destroy();
    }

    if (!chartData.labels || !chartData.labels.length || !chartData.datasets || !chartData.datasets.length) {
      alert('No volatility data available for the selected criteria.');
      return;
    }

    // Setup datasets with visual styling
    const datasets = chartData.datasets.map((dataset, index) => ({
      ...dataset,
      fill: true,
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
      borderColor: dataset.borderColor || getColor(index),
      backgroundColor: `${getColor(index)}33`, // Add transparency to fill color
    }));

    const newChart = new Chart(ctx, {
      type: 'line',
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
            title: {
              display: true,
              text: volatilityFilterState.displayType === 'monthly' ? 'Month' : 'Season',
              color: '#666666',
              padding: { top: 10, bottom: 10 },
            },
            grid: {
              display: true,
              drawBorder: true,
              color: '#E0E0E0',
            },
            ticks: {
              color: '#666666',
              padding: 10,
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Price Volatility ($)',
              color: '#666666',
              padding: { top: 10, bottom: 10 },
            },
            ticks: {
              callback: (value) => `$${value.toFixed(2)}`,
              color: '#666666',
              padding: 10,
            },
            grid: {
              display: true,
              drawBorder: true,
              color: '#E0E0E0',
            },
          },
        },
        plugins: {
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#666666',
            bodyColor: '#666666',
            borderColor: '#E0E0E0',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              title: (context) => context[0].label,
              label: (context) => {
                const volatility = context.parsed.y;
                const dataset = context.dataset;
                return `${dataset.label}: $${volatility.toFixed(2)}`;
              },
              footer: (context) => {
                if (context[0].parsed.y > 2.0) {
                  return 'High Volatility - Risky Market';
                } else if (context[0].parsed.y > 1.0) {
                  return 'Medium Volatility';
                } else {
                  return 'Low Volatility - Stable Market';
                }
              }
            },
          },
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#666666',
              font: { size: 11 },
              padding: 15,
              boxWidth: 12,
            },
          },
          annotation: {
            annotations: {
              line1: {
                type: 'line',
                yMin: 2.0,
                yMax: 2.0,
                borderColor: 'rgba(255, 0, 0, 0.5)',
                borderWidth: 2,
                borderDash: [5, 5],
                label: {
                  content: 'High Risk Threshold',
                  enabled: true,
                  position: 'center',
                  backgroundColor: 'rgba(255, 0, 0, 0.2)',
                }
              },
              line2: {
                type: 'line',
                yMin: 1.0,
                yMax: 1.0,
                borderColor: 'rgba(255, 165, 0, 0.5)',
                borderWidth: 2,
                borderDash: [5, 5],
                label: {
                  content: 'Medium Risk Threshold',
                  enabled: true,
                  position: 'center',
                  backgroundColor: 'rgba(255, 165, 0, 0.2)',
                }
              }
            }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
      },
    });

    setVolatilityChart(newChart);
  };

  const fetchVolatilityData = async (filters) => {
    const { commodities, cities, years, displayType } = filters;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token found');

      const response = await axios.get('/api/volatility_data', {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
          commodities: commodities.join(','),
          cities: cities.join(','),
          years: years.join(','),
          displayType: displayType
        },
      });

      if (response.status !== 200) {
        if (response.status === 401) {
          alert('Session expired. Please log in again.');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        throw new Error('Failed to fetch volatility data');
      }

      const data = response.data;
      setVolatilityData(data); // Save data for export
      updateVolatilityChart(data);
    } catch (error) {
      console.error('Error fetching volatility data:', error);
    }
  };

  const handleDownloadChart = () => {
    if (volatilityChart) {
      const canvas = document.getElementById('volatilityChart');
      const imageLink = document.createElement('a');
      imageLink.download = 'price_volatility_chart.png';
      imageLink.href = canvas.toDataURL('image/png');
      imageLink.click();
    }
  };

  const handleDownloadData = () => {
    if (volatilityData) {
      const worksheet = XLSX.utils.json_to_sheet(
        volatilityData.labels.map((label, index) => {
          const row = { 
            [volatilityFilterState.displayType === 'monthly' ? 'Month' : 'Season']: label 
          };
          volatilityData.datasets.forEach((dataset) => {
            row[dataset.label] = dataset.data[index];
          });
          return row;
        })
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Price Volatility');
      XLSX.writeFile(workbook, 'price_volatility_data.xlsx');
    }
  };

  const handleDownload = () => {
    handleDownloadChart();
    handleDownloadData();
  };

  useEffect(() => {
    // Initial fetch of data with default filters
    fetchVolatilityData(appliedVolatilityFilters);
  }, []);

  const handleApplyFilters = () => {
    setAppliedVolatilityFilters(volatilityFilterState); // Apply current filter state
    fetchVolatilityData(volatilityFilterState); // Fetch data using new filters
  };

  return (
    <div id="volatility-chart-section" className="section">
      <div className="row mb-4 salesBody">
        <div className="col-md-3">
          {/* Filter Panel */}
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h3>Volatility Filters</h3>
            </div>
            <div className="card-body">
              <form id="filters-volatility-data" className="filter-form active">
                {/* Display Type Selection */}
                <div className="form-group">
                  <label className="font-weight-bold">Display Type</label>
                  <select 
                    className="form-control" 
                    value={volatilityFilterState.displayType}
                    onChange={handleDisplayTypeChange}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="seasonal">Seasonal</option>
                  </select>
                </div>

                {/* Year Selection */}
                <div className="form-group">
                  <label className="font-weight-bold">Year</label>
                  <div className="checkbox-container">
                    {getYearOptions().map((year) => (
                      <label key={year} className="checkbox-item">
                        <input
                          type="checkbox"
                          value={year}
                          checked={volatilityFilterState.years.includes(year)}
                          onChange={handleYearChange}
                        />
                        {year}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Commodity Filter with Checkboxes */}
                <div className="form-group">
                  <label className="font-weight-bold">Commodity</label>
                  <div className="checkbox-container">
                    <label className="select-all">
                      <input
                        type="checkbox"
                        checked={volatilityFilterState.commodities.length === commoditiesList.length}
                        onChange={(e) => handleSelectAll(e, 'commodities')}
                      />
                      Select All
                    </label>

                    {commoditiesList.map((commodity) => (
                      <label key={commodity} className="checkbox-item">
                        <input
                          type="checkbox"
                          value={commodity}
                          checked={volatilityFilterState.commodities.includes(commodity)}
                          onChange={(e) => handleCheckboxChange(e, 'commodities')}
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
                        checked={volatilityFilterState.cities.length === citiesList.length}
                        onChange={(e) => handleSelectAll(e, 'cities')}
                      />
                      Select All
                    </label>

                    {citiesList.map((city) => (
                      <label key={city} className="checkbox-item">
                        <input
                          type="checkbox"
                          value={city}
                          checked={volatilityFilterState.cities.includes(city)}
                          onChange={(e) => handleCheckboxChange(e, 'cities')}
                        />
                        {city}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Apply Filters Button */}
                <button type="button" className="btn btn-primary btn-block" onClick={handleApplyFilters}>
                  Apply Filters
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-9">
          {/* Chart Display */}
          <div className="card resizable-block" id="volatility-data-card" data-block-title="Volatility Data">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h2>Market Price Volatility</h2>
              <button
                className="btn btn-sm btn-outline-light toggle-size"
                data-block-title="Volatility Data"
                onClick={() => window.toggleBlockSize && window.toggleBlockSize('volatility-data-card', 'Volatility Data')}
              >
                Minimize
              </button>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <p className="text-muted">
                  <i className="fas fa-info-circle"></i> This chart shows price volatility (high-low fluctuations) by month or season. 
                  Higher values indicate greater market instability and risk. Use the filters to customize your view.
                </p>
              </div>
              <canvas id="volatilityChart" ref={volatilityChartRef} width="400" height="400"></canvas>
              <div className="mt-3">
                <button className="btn btn-primary" onClick={handleDownload}>
                  Download Chart & Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VolatilityChart;
