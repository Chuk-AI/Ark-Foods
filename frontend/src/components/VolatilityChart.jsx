import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
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

  // Time frame options
  const [timeFrames, setTimeFrames] = useState([
    { label: '1D', value: '1d', days: 1 },
    { label: '3D', value: '3d', days: 3 },
    { label: '7D', value: '7d', days: 7 },
    { label: '14D', value: '14d', days: 14 },
    { label: '1M', value: '1m', days: 30 }
  ]);
  
  // Volatility Data States
  const [volatilityFilterState, setVolatilityFilterState] = useState({
    commodity: 'Shishito', // Only ONE commodity at a time
    cities: ['Baltimore'], // Default to one city
    timeFrame: '1m' // Default time frame: 1 month
  });

  const [appliedVolatilityFilters, setAppliedVolatilityFilters] = useState({
    commodity: 'Shishito', 
    cities: ['Baltimore'],
    timeFrame: '1m'
  });

  const volatilityChartRef = useRef(null);

  // Helper function to get colors
  const getColor = (index) => {
    const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];
    return colors[index % colors.length];
  };

  // Handle dropdown change for commodity
  const handleCommodityChange = (e) => {
    setVolatilityFilterState((prev) => ({
      ...prev,
      commodity: e.target.value
    }));
  };
  
  // Handle checkbox changes for cities
  const handleCityCheckboxChange = (e) => {
    const value = e.target.value;
    setVolatilityFilterState((prev) => ({
      ...prev,
      cities: prev.cities.includes(value)
        ? prev.cities.filter((item) => item !== value)
        : [...prev.cities, value],
    }));
  };
  
  // Handle "Select All" checkbox for cities
  const handleSelectAllCities = (e) => {
    setVolatilityFilterState((prev) => ({
      ...prev,
      cities: e.target.checked ? citiesList : [],
    }));
  };

  // Handle time frame selection
  const handleTimeFrameChange = (timeFrame) => {
    setVolatilityFilterState(prev => ({
      ...prev,
      timeFrame
    }));
    
    // When a time frame is changed, immediately apply it
    const newFilters = {
      ...appliedVolatilityFilters,
      timeFrame
    };
    setAppliedVolatilityFilters(newFilters);
    fetchVolatilityData(newFilters);
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
      alert('No price range data available for the selected criteria.');
      return;
    }

    // Calculate percentage changes between min and max for each data point
    // We'll add this as a custom dataset
    const percentageDatasets = [];
    
    // Process data in pairs (min and max come in pairs for each commodity)
    for (let i = 0; i < chartData.datasets.length; i += 2) {
      if (i + 1 < chartData.datasets.length) {
        const minDataset = chartData.datasets[i];
        const maxDataset = chartData.datasets[i + 1];
        const commodityName = minDataset.label.split(' - ')[0]; // Extract commodity name
        
        // Calculate percentage changes
        const percentageData = minDataset.data.map((minPrice, index) => {
          const maxPrice = maxDataset.data[index];
          if (minPrice === 0) return 0;
          return ((maxPrice - minPrice) / minPrice * 100).toFixed(2);
        });
        
        // Create a dataset for percentage volatility
        percentageDatasets.push({
          label: `${commodityName} - Volatility %`,
          data: percentageData,
          borderColor: minDataset.borderColor,
          backgroundColor: `${minDataset.borderColor}33`,
          borderWidth: 2,
          pointRadius: 3,
          fill: true,
          type: 'line'
        });
      }
    }

    // Set up the chart with three types of visualization options
    const tableOptions = {
      type: 'scatter',
      data: {
        labels: chartData.labels,
        datasets: chartData.datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Month',
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
              text: 'Price ($)',
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
                const price = context.parsed.y;
                const dataset = context.dataset;
                return `${dataset.label}: $${price.toFixed(2)}`;
              },
              footer: (context) => {
                // Find the min and max price for this commodity
                const index = context[0].dataIndex;
                const commodity = context[0].dataset.label.split(' - ')[0];
                
                // Find min and max datasets for this commodity
                let minPrice = 0;
                let maxPrice = 0;
                
                for (let i = 0; i < chartData.datasets.length; i += 2) {
                  if (i + 1 < chartData.datasets.length) {
                    if (chartData.datasets[i].label.startsWith(commodity)) {
                      minPrice = chartData.datasets[i].data[index];
                      maxPrice = chartData.datasets[i + 1].data[index];
                      break;
                    }
                  }
                }
                
                if (minPrice === 0) return null;
                
                const volatility = ((maxPrice - minPrice) / minPrice * 100).toFixed(2);
                return `Price Volatility: ${volatility}%`;
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
          }
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
      },
    };
    
    // Set up the volatility percentage chart
    const percentageOptions = {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: percentageDatasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Month',
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
              text: 'Volatility (%)',
              color: '#666666',
              padding: { top: 10, bottom: 10 },
            },
            ticks: {
              callback: (value) => `${value}%`,
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
                const percentage = context.parsed.y;
                const dataset = context.dataset;
                const commodity = dataset.label.split(' - ')[0];
                return `${commodity}: ${percentage}% volatility`;
              },
              footer: (context) => {
                const percentage = context[0].parsed.y;
                if (percentage > 20) {
                  return 'High Volatility - Risky Market';
                } else if (percentage > 10) {
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
                yMin: 20,
                yMax: 20,
                borderColor: 'rgba(255, 0, 0, 0.5)',
                borderWidth: 2,
                borderDash: [5, 5],
                label: {
                  content: 'High Risk Threshold (20%)',
                  enabled: true,
                  position: 'center',
                  backgroundColor: 'rgba(255, 0, 0, 0.2)',
                }
              },
              line2: {
                type: 'line',
                yMin: 10,
                yMax: 10,
                borderColor: 'rgba(255, 165, 0, 0.5)',
                borderWidth: 2,
                borderDash: [5, 5],
                label: {
                  content: 'Medium Risk Threshold (10%)',
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
    };

    // Default to percentage view
    const newChart = new Chart(ctx, percentageOptions);
    setVolatilityChart(newChart);
    
    // Add toggle button for switching between views
    const toggleButton = document.getElementById('toggleChartView');
    if (toggleButton) {
      toggleButton.onclick = () => {
        if (newChart) {
          newChart.destroy();
        }
        
        const viewType = document.getElementById('viewType').value;
        
        if (viewType === 'percentage') {
          setVolatilityChart(new Chart(ctx, percentageOptions));
        } else {
          setVolatilityChart(new Chart(ctx, tableOptions));
        }
      };
    }
  };

  const fetchVolatilityData = async (filters) => {
    const { commodity, cities, timeFrame } = filters;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token found');

      // Create URL with query parameters correctly
      const url = new URL('/api/volatility_data', window.location.origin);
      url.searchParams.append('commodity', commodity);
      url.searchParams.append('cities', cities.join(','));
      url.searchParams.append('timeFrame', timeFrame);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        method: 'GET'
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('Session expired. Please log in again.');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        throw new Error('Failed to fetch price range data');
      }

      const data = await response.json();
      setVolatilityData(data); // Save data for export
      updateVolatilityChart(data);
    } catch (error) {
      console.error('Error fetching price range data:', error);
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
      // Prepare data for download
      const exportData = volatilityData.labels.map((label, index) => {
        const row = { Month: label };
        
        // Group by commodity
        const commodityData = {};
        
        for (let i = 0; i < volatilityData.datasets.length; i += 2) {
          if (i + 1 < volatilityData.datasets.length) {
            const minDataset = volatilityData.datasets[i];
            const maxDataset = volatilityData.datasets[i + 1];
            const commodity = minDataset.label.split(' - ')[0];
            
            const minPrice = minDataset.data[index];
            const maxPrice = maxDataset.data[index];
            const volatilityPct = minPrice > 0 ? ((maxPrice - minPrice) / minPrice * 100).toFixed(2) : 0;
            
            row[`${commodity} - Min Price`] = minPrice;
            row[`${commodity} - Max Price`] = maxPrice;
            row[`${commodity} - Volatility %`] = `${volatilityPct}%`;
          }
        }
        
        return row;
      });
      
      const worksheet = XLSX.utils.json_to_sheet(exportData);
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
            <div className="card-body" style={{height:'600px'}}>
              <form id="filters-volatility-data" className="filter-form active">
                {/* View Type Selection */}
                <div className="form-group">
                  <label className="font-weight-bold">View Type</label>
                  <select 
                    id="viewType"
                    className="form-control"
                    defaultValue="percentage"
                  >
                    <option value="percentage">Volatility Percentage</option>
                    <option value="priceRange">Price Range</option>
                  </select>
                  <button 
                    id="toggleChartView" 
                    type="button" 
                    className="btn btn-outline-primary btn-sm mt-2"
                  >
                    Switch View
                  </button>
                </div>

                {/* Commodity Filter as Dropdown */}
                <div className="form-group">
                  <label className="font-weight-bold">Commodity</label>
                  <select
                    className="form-control"
                    value={volatilityFilterState.commodity}
                    onChange={handleCommodityChange}
                  >
                    {commoditiesList.map((commodity) => (
                      <option key={commodity} value={commodity}>
                        {commodity}
                      </option>
                    ))}
                  </select>
                </div>

                {/* City Filter with Checkboxes */}
                <div className="form-group">
                  <label className="font-weight-bold">City</label>
                  <div className="checkbox-container">
                    <label className="select-all">
                      <input
                        type="checkbox"
                        checked={volatilityFilterState.cities.length === citiesList.length}
                        onChange={handleSelectAllCities}
                      />
                      Select All
                    </label>

                    {citiesList.map((city) => (
                      <label key={city} className="checkbox-item">
                        <input
                          type="checkbox"
                          value={city}
                          checked={volatilityFilterState.cities.includes(city)}
                          onChange={handleCityCheckboxChange}
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
            
            {/* Time Frame Filter Buttons (Crypto-style) */}
            <div className="time-frame-selector d-flex justify-content-center bg-light py-2 border-bottom">
              {timeFrames.map(frame => (
                <button
                  key={frame.value}
                  className={`btn ${appliedVolatilityFilters.timeFrame === frame.value ? 'btn-primary' : 'btn-outline-secondary'} mx-1`}
                  onClick={() => handleTimeFrameChange(frame.value)}
                >
                  {frame.label}
                </button>
              ))}
            </div>
            
            <div className="card-body" style={{height:'550px'}}>
              <p className="text-muted">
                <i className="fas fa-info-circle"></i> This chart shows price volatility as percentage fluctuations by month.
                Higher percentages indicate greater market instability and risk. Toggle between percentage view and price range view.
                Use the time frame buttons above to adjust the data granularity.
              </p>
            
              <div className="card-body" style={{ height: '450px', overflow: 'hidden' }}>
                <canvas id="volatilityChart" ref={volatilityChartRef} className="fixed-chart"></canvas>
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

export default VolatilityChart;