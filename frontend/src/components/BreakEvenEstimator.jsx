import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import 'chartjs-plugin-datalabels';
import 'chartjs-adapter-moment';
import 'chartjs-adapter-luxon';
import moment from 'moment';
import axios from 'axios';

import * as XLSX from 'xlsx';

const BreakEvenEstimator = () => {
  const [forecastChart, setForecastChart] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [calculatedForecast, setCalculatedForecast] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savedEstimation, setSavedEstimation] = useState(null);
  const [savedEstimations, setSavedEstimations] = useState([]);
  
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
    "Select All","Baltimore", "Boston", "Chicago", "Columbia", "Miami", "New York", "Philadelphia", "Los Angeles"
  ]);
  
  // Form State - Matches Revenue Calculator fields exactly
  const [formState, setFormState] = useState({
    variety: 'Shishito',
    start_date: '2024-04-09',
    // forecast_date: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
    yield_per_acre: 2000,
    cost_per_acre: 10,
    harvest_cost_per_box: 10,
    cost_of_box: 1,
    boxes_bonus_per_yield: 10,
    // Date range for forecast comparison
    startDateRange: new Date().toISOString().split('T')[0],
    endDateRange: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    city: 'New York' // Added for forecast line data API
  });
  
  const chartRef = useRef(null);
  
  // Helper function to get colors
  const getColor = (index) => {
    const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];
    return colors[index % colors.length];
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Load saved estimations on component mount
  useEffect(() => {
    loadSavedEstimations();
  }, []);
  
  // Function to load all saved estimations
  const loadSavedEstimations = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token found');
      
      const response = await axios.get('/api/break_even', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });
      
      setSavedEstimations(response.data);
    } catch (error) {
      console.error('Error loading saved estimations:', error);
    }
  };
  
  // Function to load a specific estimation
  const loadEstimation = (estimation) => {
    // Set form state from saved estimation
    setFormState({
      variety: estimation.variety,
      city: estimation.city,
      start_date: estimation.start_date,
      forecast_date: estimation.forecast_date,
      yield_per_acre: estimation.yield_per_acre,
      cost_per_acre: estimation.cost_per_acre,
      harvest_cost_per_box: estimation.harvest_cost_per_box,
      cost_of_box: estimation.cost_of_box,
      boxes_bonus_per_yield: estimation.boxes_bonus_per_yield,
      startDateRange: estimation.start_date_range,
      endDateRange: estimation.end_date_range,
    });
    
    // Set calculated forecast from saved data
    setCalculatedForecast({
      forecasted_price: estimation.forecasted_price,
      revenue_per_acre: estimation.revenue_per_acre,
      revenue_per_acre_after_costings: estimation.revenue_after_costs,
      season: estimation.season
    });
    
    // Load the chart data (you would need to fetch this again)
    handleCalculate();
  };
  
  // Function to save the current estimation
  const handleSaveEstimation = async () => {
    if (!calculatedForecast) {
      setError('Please calculate before saving');
      return;
    }
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token found');
      

      const forecast_date = moment(formState.start_date)
                        .add(1, 'year')
                        .format('YYYY-MM-DD');

      // Prepare data for saving
      const saveData = {
        variety: formState.variety,
        city: formState.city,
        start_date: formState.start_date,
        forecast_date, 
        yield_per_acre: parseFloat(formState.yield_per_acre),
        cost_per_acre: parseFloat(formState.cost_per_acre),
        harvest_cost_per_box: parseFloat(formState.harvest_cost_per_box),
        cost_of_box: parseFloat(formState.cost_of_box),
        boxes_bonus_per_yield: parseFloat(formState.boxes_bonus_per_yield),
        start_date_range: formState.startDateRange,
        end_date_range: formState.endDateRange,
        // Include calculated results
        forecasted_price: calculatedForecast.forecasted_price,
        revenue_per_acre: calculatedForecast.revenue_per_acre,
        revenue_after_costs: calculatedForecast.revenue_per_acre_after_costings,
        season: calculatedForecast.season
      };
      
      const response = await axios.post('/api/break_even/save', saveData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSavedEstimation(response.data);
      alert('Estimation saved successfully!');
      
      // Refresh the list of saved estimations
      loadSavedEstimations();
      
    } catch (error) {
      console.error('Error saving estimation:', error);
      setError('Failed to save estimation. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate forecast and fetch forecast line data
  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
  
    try {
      /* 1 ──────────────────────────────────
         Run the revenue‑calculator endpoint
      ────────────────────────────────────── */

      // derive forecast_date exactly 1 year after the start_date
      const forecast_date = moment(formState.start_date)
      .add(1, 'year')
      .format('YYYY-MM-DD');


      const forecastResponse = await axios.post("/api/calculate_forecast", {
        variety: formState.variety,
        start_date: formState.start_date,
        forecast_date,
        yield_per_acre: parseFloat(formState.yield_per_acre),
        cost_per_acre: parseFloat(formState.cost_per_acre),
        harvest_cost_per_box: parseFloat(formState.harvest_cost_per_box),
        cost_of_box: parseFloat(formState.cost_of_box),
        boxes_bonus_per_yield: parseFloat(formState.boxes_bonus_per_yield),
      });
  
      const calculatedData = forecastResponse.data;
      setCalculatedForecast(calculatedData);
  
      /* 2 ──────────────────────────────────
         Fetch the historical / forecast line
         data for chart comparison
      ────────────────────────────────────── */
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No token found");
  
      // “All Cities” means aggregate across every city
      const isAllCities = formState.city === "ALL";
  
      const forecastLineResponse = await axios.get("/api/forecast_line_data", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          commodities: formState.variety,
          cities: isAllCities ? "" : formState.city,  // empty → back‑end ignores filter
          averageCommodities: false,
          averageCities: isAllCities,                 // true when “ALL”
          startDate: formState.startDateRange,
          endDate: formState.endDateRange,
        },
      });
  
      const lineData = forecastLineResponse.data;
      setForecastData(lineData);
  
      /* 3 ──────────────────────────────────
         Draw / refresh the chart
      ────────────────────────────────────── */
      const revenuePerBox =
        calculatedData.revenue_per_acre_after_costings /
        parseFloat(formState.yield_per_acre);
  
      updateChart(lineData, revenuePerBox);
    } catch (err) {
      console.error("Error calculating or fetching forecast data:", err);
      setError("Failed to calculate or fetch data. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  
  const updateChart = (chartData, revenuePerBox) => {
    if (!chartRef.current) {
      console.error('Canvas element not found');
      return;
    }
    
    const ctx = chartRef.current.getContext('2d');
    
    if (forecastChart) {
      forecastChart.destroy();
    }
    
    if (!chartData || !chartData.labels || !chartData.datasets || chartData.datasets.length === 0) {
      setError('No forecast data available for the selected criteria.');
      return;
    }
    
    // Get the forecast dataset
    const forecastDataset = chartData.datasets[0];
    
    // Create the revenue per box line dataset
    const revenueLineData = Array(chartData.labels.length).fill(revenuePerBox);
    
    // Create datasets
    const datasets = [
      // Original forecast line
      {
        label: `${formState.variety} Forecast Price`,
        data: forecastDataset.data,
        borderColor: getColor(0),
        backgroundColor: getColor(0),
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.1,
        fill: false,
        borderDash: [5, 5]
      },
      // Revenue per box line
      {
        label: 'Cost Per Box (Break-Even)',
        data: revenueLineData,
        borderColor: '#888888',
        backgroundColor: '#888888',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0,
        fill: false
      },
      // Full background dataset
      {
        label: 'Background Range',
        data: forecastDataset.data,
        backgroundColor: (context) => {
          if (context.index === undefined) return 'transparent';
          const forecastPrice = forecastDataset.data[context.index];
          return forecastPrice >= revenuePerBox 
            ? 'rgba(75, 192, 75, 0.6)' // Green when above break-even
            : 'rgba(255, 99, 132, 0.6)'; // Red when below break-even
        },
        borderWidth: 0,
        pointRadius: 0,
        fill: {
          target: {value: revenuePerBox},
          below: 'rgba(255, 99, 132, 0.6)', // Red below break-even
          above: 'rgba(75, 192, 75, 0.6)' // Green above break-even
        }
      }
    ];
    
    const newChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: datasets
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
              minRotation: 45
            },
            title: {
              display: true,
              text: 'Season',
              color: '#666666',
              padding: { top: 10, bottom: 10 }
            }
          },
          y: {
            display: true,
            position: 'left',
            grid: { display: true, drawBorder: true, color: '#E0E0E0' },
            ticks: {
              display: true,
              color: '#666666',
              padding: 10,
              callback: (value) => `$${value.toFixed(2)}`
            },
            title: {
              display: true,
              text: 'Price ($)',
              color: '#666666',
              padding: { top: 10, bottom: 10 }
            }
          }
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
                // Don't show area datasets in tooltip
                if (context.dataset.label === 'Background Range') {
                  return null;
                }
                return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
              },
              footer: (context) => {
                const forecastValue = context[0].raw;
                const difference = forecastValue - revenuePerBox;
                
                if (difference >= 0) {
                  return `Profit: $${difference.toFixed(2)} above break-even`;
                } else {
                  return `Loss: $${Math.abs(difference).toFixed(2)} below break-even`;
                }
              }
            }
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
              filter: (legendItem) => {
                // Only show main datasets in legend
                return legendItem.text !== 'Background Range';
              }
            }
          },
          datalabels: {
            display: false // Globally disable datalabels
          }
        },
        interaction: { mode: 'index', intersect: false }
      }
    });
    
    setForecastChart(newChart);
  };
  
  const handleDownloadChart = () => {
    if (forecastChart) {
      const canvas = document.getElementById('breakEvenChart');
      const imageLink = document.createElement('a');
      imageLink.download = 'break_even_analysis.png';
      imageLink.href = canvas.toDataURL('image/png');
      imageLink.click();
    }
  };


  // ... rest of the component remains the same (download functions, return statement, etc.)
  const handleDownloadData = () => {
    if (forecastData && calculatedForecast) {
      const revenuePerBox = calculatedForecast.revenue_per_acre_after_costings / parseFloat(formState.yield_per_acre);
      
      const worksheet = XLSX.utils.json_to_sheet(
        forecastData.labels.map((label, index) => {
          const forecastPrice = forecastData.datasets[0].data[index];
          const difference = forecastPrice - revenuePerBox;
          const profitable = forecastPrice >= revenuePerBox;
          
          return {
            Season: label,
            'Forecast Price': forecastPrice,
            'Revenue Per Box': revenuePerBox.toFixed(2),
            'Difference': difference.toFixed(2),
            'Profitable': profitable ? 'Yes' : 'No'
          };
        })
      );
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Break Even Analysis');
      XLSX.writeFile(workbook, 'break_even_analysis.xlsx');
    }
  };
  
  const handleDownload = () => {
    handleDownloadChart();
    handleDownloadData();
  };
  
  return (
    <div className="container-fluid p-0">
      <div className="row">
        {/* Form Panel - Left Side Column */}
        <div className="col-lg-3">
          <div className={`filter-sidebar ${showFilters ? 'show' : 'd-none d-lg-block'}`}>
            <div className="card mb-4" style={{ height: '100%' }}>
              <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Break-Even Calculator</h5>
                <button 
                  className="btn btn-sm btn-outline-light d-lg-none"
                  onClick={() => setShowFilters(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="card-body" style={{ 
                padding: '15px', 
                maxHeight: '75vh',
                overflowY: 'auto'
              }}>
                {/* Saved Estimations Dropdown */}
                {savedEstimations.length > 0 && (
                  <div className="form-group mb-4">
                    <label className="font-weight-bold">Saved Estimations</label>
                    <select
                      className="form-control"
                      onChange={(e) => {
                        const id = parseInt(e.target.value);
                        if (id) {
                          const selected = savedEstimations.find(est => est.id === id);
                          if (selected) loadEstimation(selected);
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="">Select a saved estimation</option>
                      {savedEstimations.map(est => (
                        <option key={est.id} value={est.id}>
                          {est.variety} - {est.city} - {new Date(est.created_at).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <form id="break-even-form">
                  <h6 className="text-muted mb-3">Crop Information</h6>
                  
                  {/* Variety Selection */}
                  <div className="form-group">
                    <label className="font-weight-bold">Variety</label>
                    <select 
                      className="form-control"
                      name="variety"
                      value={formState.variety}
                      onChange={handleInputChange}
                    >
                      {commoditiesList.map(commodity => (
                        <option key={commodity} value={commodity}>{commodity}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* City Selection */}
                  <div className="form-group">
                    <label className="font-weight-bold">Market (City)</label>
                 {/* ❷  city <select> → include the option */}
                  <select
                    className="form-control"
                    name="city"
                    value={formState.city}
                    onChange={handleInputChange}
                  >
                  <option value="ALL">All Cities (average)</option>
                    {citiesList
                      .filter(c => c !== "Select All")        
                      .map(city => (
                        <option key={city} value={city}>{city}</option>
                    ))}
                  </select>

                  </div>
                  
                  {/* Planting and Harvest Dates */}
                  <div className="form-group">
                    <label className="font-weight-bold">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      name="start_date"
                      value={formState.start_date}
                      onChange={handleInputChange}
                    />
                  </div>
                  
      
                  
                  <h6 className="text-muted mb-3 mt-4">Yield Information</h6>
                  
                  {/* Yield Per Acre */}
                  <div className="form-group">
                    <label className="font-weight-bold">Yield Per Acre (boxes)</label>
                    <input
                      type="number"
                      className="form-control"
                      name="yield_per_acre"
                      value={formState.yield_per_acre}
                      onChange={handleInputChange}
                      min="1"
                      step="1"
                    />
                  </div>
                  
                  <h6 className="text-muted mb-3 mt-4">Cost Information</h6>
                  
                  {/* Cost Fields */}
                  <div className="form-group">
                    <label className="font-weight-bold">Cost Per Acre ($)</label>
                    <input
                      type="number"
                      className="form-control"
                      name="cost_per_acre"
                      value={formState.cost_per_acre}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="font-weight-bold">Harvest Cost Per Box ($)</label>
                    <input
                      type="number"
                      className="form-control"
                      name="harvest_cost_per_box"
                      value={formState.harvest_cost_per_box}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="font-weight-bold">Cost of Box ($)</label>
                    <input
                      type="number"
                      className="form-control"
                      name="cost_of_box"
                      value={formState.cost_of_box}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="font-weight-bold">Boxes Bonus Per Yield</label>
                    <input
                      type="number"
                      className="form-control"
                      name="boxes_bonus_per_yield"
                      value={formState.boxes_bonus_per_yield}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
           
             
                  
                  {/* Calculate Button */}
                  <button 
                    type="button" 
                    className="btn btn-primary btn-block mt-4" 
                    onClick={handleCalculate}
                    disabled={loading}
                  >
                    {loading ? 'Calculating...' : 'Calculate Break-Even Analysis'}
                  </button>
                  
                  {/* Save Button - Shown after calculation */}
                  {calculatedForecast && (
                    <button 
                      type="button" 
                      className="btn btn-success btn-block mt-2" 
                      onClick={handleSaveEstimation}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Estimation'}
                    </button>
                  )}
                </form>
                
        
              </div>
            </div>
          </div>
        </div>
        
        {/* Chart Display - Right Side Column */}
        <div className="col-lg-9">
          <div className="card mb-4" style={{ height: '100%' }}>
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h4 className="mb-0">Break-Even Price Analysis</h4>
              <div>
                <button
                  className="btn btn-sm btn-outline-light mr-2 d-inline-block d-lg-none"
                  onClick={() => setShowFilters(true)}
                >
                  <i className="fas fa-filter"></i> Calculator
                </button>
                <button 
                  className="btn btn-sm btn-outline-light"
                  onClick={() => window.toggleBlockSize && window.toggleBlockSize('break-even-chart-card', 'Break-Even Analysis')}
                >
                  <i className="fas fa-expand-arrows-alt"></i>
                </button>
              </div>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              
              {!calculatedForecast && !error && (
                <div className="text-center p-5">
                  <i className="fas fa-chart-area fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">Enter crop information and calculate to view the break-even analysis</h5>
                  <p className="text-muted">The chart will show periods where forecasted prices are profitable compared to your break-even price.</p>
                </div>
              )}
              
              <div className="chart-container" style={{ position: 'relative', height: '60vh', width: '100%', display: calculatedForecast ? 'block' : 'none' }}>
                <canvas id="breakEvenChart" ref={chartRef}></canvas>
              </div>
              
              {calculatedForecast && (
                <div className="mt-3">
                  <div className="row">
                    <div className="col-md-8">
                      <div className="d-flex mt-2">
                        <div className="mr-4">
                          <span className="badge badge-success mr-2">&nbsp;</span>
                          <small>Profitable (Above Break-Even)</small>
                        </div>
                        <div>
                          <span className="badge badge-danger mr-2">&nbsp;</span>
                          <small>Unprofitable (Below Break-Even)</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4 text-right">
                      <button className="btn btn-primary" onClick={handleDownload}>
                        <i className="fas fa-download mr-2"></i>
                        Download Analysis
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreakEvenEstimator;