import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import 'chartjs-plugin-datalabels';
import 'chartjs-adapter-moment';
import 'chartjs-adapter-luxon';
import moment from 'moment';
import axios from 'axios';
import * as XLSX from 'xlsx';

const ForecastLineChart = () => {
  const [forecastChart, setForecastChart] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [showFilters, setShowFilters] = useState(true); // Default to showing filters on mobile
  const [commoditiesList, setCommoditiesList] = useState([
    'Anaheim', 'Cubanelle', 'Jalapeno', 'Poblano', 'Serrano', 'Shishito'
  ]);
  
  const [citiesList, setCitiesList] = useState([
    "Baltimore", "Boston", "Chicago", "Columbia", "Miami", "New York", "Philadelphia", "Los Angeles"
  ]);
  
  // Forecast Data States
  const [forecastFilterState, setForecastFilterState] = useState({
    commodities: ['Shishito'], // Default to one or more items
    cities: ['New York'], // Default to New York
    averageCommodities: false,
    averageCities: false,
    startDate: new Date().toISOString().split('T')[0], // Default to current date
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0], // Default to current date + 2 years
  });

  const [appliedForecastFilters, setAppliedForecastFilters] = useState({
    commodities: ['Shishito'],
    cities: ['New York'],
    averageCommodities: false,
    averageCities: false,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
  });

  const forecastChartRef = useRef(null);

  // Helper function to get colors
  const getColor = (index) => {
    const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];
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
      [type]: e.target.checked ? (type === 'commodities' ? commoditiesList : citiesList) : [],
    }));
  };

  // Handle Average Commodities Change
  const handleAverageCommoditiesChange = (e) => {
    setForecastFilterState((prev) => ({
      ...prev,
      averageCommodities: e.target.checked,
    }));
  };

  // Handle Average Cities Change
  const handleAverageCitiesChange = (e) => {
    setForecastFilterState((prev) => ({
      ...prev,
      averageCities: e.target.checked,
    }));
  };

  // Handle Start Date Change
  const handleStartDateChange = (e) => {
    const newStartDate = e.target.value;
    setForecastFilterState((prev) => ({
      ...prev,
      startDate: newStartDate,
      // Ensure endDate is not before startDate
      endDate: prev.endDate < newStartDate ? newStartDate : prev.endDate,
    }));
  };

  // Handle End Date Change
  const handleEndDateChange = (e) => {
    const newEndDate = e.target.value;
    setForecastFilterState((prev) => ({
      ...prev,
      endDate: newEndDate,
    }));
  };

  const updateForecastChart = (chartData) => {
    if (!forecastChartRef.current) {
      console.error('Canvas element not found');
      return;
    }

    const ctx = forecastChartRef.current.getContext('2d');

    if (forecastChart) {
      forecastChart.destroy();
    }

    if (!chartData.labels || !chartData.labels.length || !chartData.datasets || !chartData.datasets.length) {
      alert('No forecast data available for the selected criteria.');
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
            type: 'category',
            grid: { display: true, drawBorder: true, color: '#E0E0E0' },
            ticks: {
              display: true,
              maxTicksLimit: 10,
              color: '#666666',
              padding: 10,
              autoSkip: true,
              maxRotation: 45,
              minRotation: 45,
            },
            title: {
              display: true,
              text: 'Season',
              color: '#666666',
              padding: { top: 10, bottom: 10 },
            },
          },
          y: {
            display: true,
            position: 'left',
            grid: { display: true, drawBorder: true, color: '#E0E0E0' },
            ticks: {
              display: true,
              color: '#666666',
              padding: 10,
              callback: (value) => `$${value.toFixed(2)}`,
            },
            title: {
              display: true,
              text: 'Price ($)',
              color: '#666666',
              padding: { top: 10, bottom: 10 },
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
              label: (context) => `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`,
              footer: (context) => {
                const label = context[0].label;
                // Check if this is a forecasted value (any season after current)
                const labelIndex = chartData.labels.indexOf(label);
                if (labelIndex >= futureStartIndex) {
                  return 'Forecasted Price';
                }
                return '';
              }
            },
          },
          legend: {
            display: true,
            position: 'top',
            align: 'center',
            labels: {
              boxWidth: 12,
              padding: 15,
              color: '#666666',
              font: { size: 11 },
            },
          },
          datalabels: {
            display: false, // Globally disable datalabels
          },
        },
        interaction: { mode: 'index', intersect: false },
      },
    });

    setForecastChart(newChart);
  };

  const fetchForecastData = async (filters) => {
    const { commodities, cities, averageCommodities, averageCities, startDate, endDate } = filters;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token found');

      const response = await axios.get('/api/forecast_line_data', {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
          commodities: commodities.join(','),
          cities: cities.join(','),
          averageCommodities: averageCommodities,
          averageCities: averageCities,
          startDate: filters.startDate,
          endDate: filters.endDate
        },
      });

      if (response.status !== 200) {
        if (response.status === 401) {
          alert('Session expired. Please log in again.');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        throw new Error('Failed to fetch forecast data');
      }

      const data = response.data;
      setForecastData(data); // Save data for export
      updateForecastChart(data);
    } catch (error) {
      console.error('Error fetching forecast data:', error);
    }
  };

  const handleDownloadChart = () => {
    if (forecastChart) {
      const canvas = document.getElementById('forecastLineChart');
      const imageLink = document.createElement('a');
      imageLink.download = 'forecast_prices_chart.png';
      imageLink.href = canvas.toDataURL('image/png');
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
        })
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Forecast Prices');
      XLSX.writeFile(workbook, 'forecast_prices_data.xlsx');
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
    
    // Close the filter panel on mobile after applying
    if (window.innerWidth < 992) {
      setShowFilters(false);
    }
  };

  return (
    <div className="container-fluid p-0">
      <div className="row">
        {/* Filter Panel - Left Side Column */}
        <div className="col-lg-3">
          <div className={`filter-sidebar ${showFilters ? 'show' : 'd-none d-lg-block'}`} style={{ display: 'block' }}>
            <div className="card mb-4" style={{ border: '1px solid #dee2e6' }}>
              <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Forecast Filters</h5>
                <button 
                  className="btn btn-sm btn-outline-light d-lg-none"
                  onClick={() => setShowFilters(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="card-body" style={{ 
        padding: '15px', 
        height: 'calc(100% - 56px)', // Subtract header height
        overflowY: 'auto' // This enables scrolling
      }}>           
             <form id="filters-forecast-data" className="filter-form" style={{ display: 'block' }}>
                  {/* Commodity Filter with Checkboxes */}
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="font-weight-bold" style={{ display: 'block', marginBottom: '0.5rem' }}>Commodity</label>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={forecastFilterState.commodities.length === commoditiesList.length}
                          onChange={(e) => handleSelectAllForecast(e, 'commodities')}
                          style={{ marginRight: '0.5rem' }}
                        />
                        Select All
                      </label>
                      <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #dee2e6', padding: '8px' }}>
                        {commoditiesList.map((commodity) => (
                          <label key={commodity} style={{ display: 'block', marginBottom: '0.25rem' }}>
                            <input
                              type="checkbox"
                              value={commodity}
                              checked={forecastFilterState.commodities.includes(commodity)}
                              onChange={(e) => handleCheckboxChangeForecast(e, 'commodities')}
                              style={{ marginRight: '0.5rem' }}
                            />
                            {commodity}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
  
                  {/* Average Commodities Checkbox */}
                  <div className="form-group form-check" style={{ marginBottom: '1rem' }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="averageCommoditiesForecast"
                      checked={forecastFilterState.averageCommodities}
                      onChange={handleAverageCommoditiesChange}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <label className="form-check-label font-weight-bold" htmlFor="averageCommoditiesForecast">
                      Average over Commodities
                    </label>
                  </div>
  
                  {/* City Filter with Checkboxes */}
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="font-weight-bold" style={{ display: 'block', marginBottom: '0.5rem' }}>City</label>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={forecastFilterState.cities.length === citiesList.length}
                          onChange={(e) => handleSelectAllForecast(e, 'cities')}
                          style={{ marginRight: '0.5rem' }}
                        />
                        Select All
                      </label>
                      <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #dee2e6', padding: '8px' }}>
                        {citiesList.map((city) => (
                          <label key={city} style={{ display: 'block', marginBottom: '0.25rem' }}>
                            <input
                              type="checkbox"
                              value={city}
                              checked={forecastFilterState.cities.includes(city)}
                              onChange={(e) => handleCheckboxChangeForecast(e, 'cities')}
                              style={{ marginRight: '0.5rem' }}
                            />
                            {city}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
  
                  {/* Average Cities Checkbox */}
                  <div className="form-group form-check" style={{ marginBottom: '1rem' }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="averageCitiesForecast"
                      checked={forecastFilterState.averageCities}
                      onChange={handleAverageCitiesChange}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <label className="form-check-label font-weight-bold" htmlFor="averageCitiesForecast">
                      Average over Cities
                    </label>
                  </div>
  
                  {/* Date Range Filters */}
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="font-weight-bold" style={{ display: 'block', marginBottom: '0.5rem' }}>Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={forecastFilterState.startDate}
                      onChange={handleStartDateChange}
                      style={{ width: '100%', padding: '0.375rem 0.75rem', border: '1px solid #ced4da', borderRadius: '0.25rem' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="font-weight-bold" style={{ display: 'block', marginBottom: '0.5rem' }}>End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={forecastFilterState.endDate}
                      onChange={handleEndDateChange}
                      min={forecastFilterState.startDate}
                      style={{ width: '100%', padding: '0.375rem 0.75rem', border: '1px solid #ced4da', borderRadius: '0.25rem' }}
                    />
                  </div>
  
                  {/* Apply Filters Button */}
                  <button 
                    type="button" 
                    className="btn btn-primary btn-block" 
                    onClick={handleApplyForecastFilters}
                    style={{ 
                      width: '100%', 
                      backgroundColor: '#007bff', 
                      color: 'white',
                      padding: '0.375rem 0.75rem',
                      border: '1px solid transparent',
                      borderRadius: '0.25rem'
                    }}
                  >
                    Apply Filters
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
  
        {/* Chart Display - Right Side Column */}
        <div className="col-lg-9">
          <div className="card mb-4" style={{ border: '1px solid #dee2e6' }}>
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h4 className="mb-0">Price Forecast Trends</h4>
              <div>
                <button
                  className="btn btn-sm btn-outline-light mr-2 d-inline-block d-lg-none"
                  onClick={() => setShowFilters(true)}
                >
                  <i className="fas fa-filter"></i> Filters
                </button>
                <button 
                  className="btn btn-sm btn-outline-light"
                  onClick={() => window.toggleBlockSize && window.toggleBlockSize('forecast-line-data-card', 'Forecast Line Data')}
                >
                  <i className="fas fa-expand-arrows-alt"></i>
                </button>
              </div>
            </div>
            <div className="card-body" style={{ padding: '15px' }}>
              <div className="chart-container" style={{ position: 'relative', height: '60vh', width: '100%' }}>
                <canvas id="forecastLineChart" ref={forecastChartRef}></canvas>
              </div>
              <div className="mt-3 d-flex justify-content-end">
                <button 
                  className="btn btn-primary" 
                  onClick={handleDownload}
                  style={{ 
                    backgroundColor: '#007bff', 
                    color: 'white',
                    padding: '0.375rem 0.75rem',
                    border: '1px solid transparent',
                    borderRadius: '0.25rem'
                  }}
                >
                  <i className="fas fa-download mr-2"></i>
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

export default ForecastLineChart;