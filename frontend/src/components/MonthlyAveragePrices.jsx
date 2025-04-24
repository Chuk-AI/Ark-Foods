import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';

const MonthlyAveragePrices = () => {
  // State for form inputs
  const [formState, setFormState] = useState({
    commodity: 'Shishito',
    startMonth: 1,  // January
    endMonth: 9,    // September
    startYear: 2019,
    endYear: 2022,
    source: 'ProduceIQ'  // Default data source

  });

  // State for chart and data
  const [monthlyPrices, setMonthlyPrices] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Use ref to store chart instance
  const chartRef = useRef(null);
  const chartInitializedRef = useRef(false);

  // Predefined lists
  const commodities = [
    'Shishito', 'Anaheim', 'Cubanelle', 'Jalapeno', 
    'Poblano', 'Serrano', 'Habanero', 'Fresno'
  ];

  // Month options
  const months = [
    'January', 'February', 'March', 'April', 
    'May', 'June', 'July', 'August', 
    'September', 'October', 'November', 'December'
  ];

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: name === 'commodity' 
        ? value  // Keep commodity as a string
        : parseInt(value)  // Convert other inputs to integers
    }));
  };

  // Fetch monthly average prices
  const fetchMonthlyPrices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate inputs
      if (formState.startMonth > formState.endMonth) {
        setError('Start month cannot be after end month');
        setLoading(false);
        return;
      }
      
      if (formState.startYear > formState.endYear) {
        setError('Start year cannot be after end year');
        setLoading(false);
        return;
      }
      
      // Make the API call
      const response = await axios.get('/api/monthly-average-prices', {
        params: {
          commodity: formState.commodity,
          start_month: formState.startMonth,
          end_month: formState.endMonth,
          start_year: formState.startYear,
          end_year: formState.endYear,
          source: formState.source  // Add source parameter

        }
      });
      
      console.log('API Response:', response.data);
      
      // Ensure we have data in the expected format
      if (response.data && response.data.monthly_prices) {
        setMonthlyPrices(response.data.monthly_prices);
        
        // Add a slight delay to ensure DOM is ready
        setTimeout(() => {
          updateChart(response.data.monthly_prices);
        }, 50);
      } else {
        setError('No data available for the selected criteria');
      }
    } catch (error) {
      console.error('Error fetching monthly prices:', error);
      setError('Failed to fetch monthly prices: ' + 
        (error.response?.data?.error || error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Update chart
  const updateChart = (data) => {
    const canvas = document.getElementById('monthlyPriceChart');
    
    // Debug logging
    console.log('updateChart called with data:', data);
    console.log('Canvas element:', canvas);
    
    if (!canvas) {
      console.error('Canvas element not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }
    
    // Explicitly set canvas dimensions
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.height = canvas.offsetHeight;
    canvas.width = canvas.offsetWidth;
    
    // Destroy existing chart if it exists
    if (chartRef.current) {
      console.log('Destroying existing chart');
      chartRef.current.destroy();
      chartRef.current = null;
    }

    // Ensure we have data
    if (!data || data.length === 0) {
      console.error('No data to create chart');
      return;
    }

    // Prepare chart data with explicit type conversion
    const labels = data.map(item => item.month);
    const values = data.map(item => Number(item.avg_price));
    
    console.log('Chart labels:', labels);
    console.log('Chart values:', values);

    // Create chart options
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        title: {
          display: true,
          text: `Monthly Average Prices for ${formState.commodity} (${formState.startYear}-${formState.endYear}, ${formState.source})`,
          font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              if (!context || !context.dataset || !context.dataset.data) return '';
              
              const dataIndex = context.dataIndex;
              const monthData = data[dataIndex];
              
              const tooltipLines = [
                `Avg Price: $${Number(monthData.avg_price).toFixed(2)}`,
                `Min Price: $${Number(monthData.min_price).toFixed(2)}`,
                `Max Price: $${Number(monthData.max_price).toFixed(2)}`,
              ];
              
              // Add yearly breakdown if available
              if (monthData.years_data && monthData.years_data.length > 0) {
                tooltipLines.push('');
                tooltipLines.push('Yearly Breakdown:');
                monthData.years_data.forEach(yearData => {
                  tooltipLines.push(`${yearData.year}: $${Number(yearData.avg_price).toFixed(2)}`);
                });
              }
              
              return tooltipLines;
            }
          }
        }
      },
      scales: {
        x: { 
          title: {
            display: true,
            text: 'Months'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Price ($)'
          },
          beginAtZero: true
        }
      }
    };

    // Create new chart
    try {
      console.log('Creating new chart');
      chartRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: `Average Price for ${formState.commodity}`,
              data: values,
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1
            }
          ]
        },
        options: chartOptions
      });
      
      chartInitializedRef.current = true;
      console.log('Chart created successfully');
    } catch (error) {
      console.error('Error creating chart:', error);
    }
  };

  // Effect to cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  // Re-render chart if window resizes
  useEffect(() => {
    const handleResize = () => {
      if (monthlyPrices && chartInitializedRef.current) {
        updateChart(monthlyPrices);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [monthlyPrices]);

  return (
    <div className="container-fluid p-4">
      <div className="row">
        {/* Filter Panel */}
        <div className="col-md-4">
          <div className="card">
            <div className="card-header bg-primary text-white">
              Monthly Price Filters
            </div>
            <div className="card-body">
              {/* Commodity Selection */}
              <div className="form-group mb-3">
                <label>Commodity</label>
                <select
                  name="commodity"
                  value={formState.commodity}
                  onChange={handleInputChange}
                  className="form-control"
                >
                  {commodities.map(commodity => (
                    <option key={commodity} value={commodity}>
                      {commodity}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Range */}
              <div className="form-group mb-3">
                <label>Start Month</label>
                <select
                  name="startMonth"
                  value={formState.startMonth}
                  onChange={handleInputChange}
                  className="form-control"
                >
                  {months.map((month, index) => (
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group mb-3">
                <label>End Month</label>
                <select
                  name="endMonth"
                  value={formState.endMonth}
                  onChange={handleInputChange}
                  className="form-control"
                >
                  {months.map((month, index) => (
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Range */}
              <div className="form-group mb-3">
                <label>Start Year</label>
                <input
                  type="number"
                  name="startYear"
                  value={formState.startYear}
                  onChange={handleInputChange}
                  className="form-control"
                  min="2000"
                  max={new Date().getFullYear()}
                />
              </div>

              <div className="form-group mb-3">
                <label>End Year</label>
                <input
                  type="number"
                  name="endYear"
                  value={formState.endYear}
                  onChange={handleInputChange}
                  className="form-control"
                  min="2000"
                  max={new Date().getFullYear()}
                />
              </div>

              {/* Data Source Selection */}
<div className="form-group mb-3">
  <label>Data Source</label>
  <select
    name="source"
    value={formState.source}
    onChange={handleInputChange}
    className="form-control"
  >
    <option value="ProduceIQ">ProduceIQ</option>
    <option value="USDA">USDA</option>
    <option value="ProduceIQ,USDA">Both Sources</option>
  </select>
</div>

              {/* Calculate Button */}
              <button
                onClick={fetchMonthlyPrices}
                className="btn btn-primary btn-block w-100"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Generate Monthly Prices'}
              </button>
              
              {/* Error Display */}
              {error && (
                <div className="alert alert-danger mt-3">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart Panel */}
        <div className="col-md-8">
          <div className="card">
            <div className="card-header bg-primary text-white">
              Monthly Average Prices
            </div>
            <div className="card-body">
              <div className="chart-container" style={{ position: 'relative', height: '60vh', width: '100%' }}>
                {loading ? (
                  <div className="d-flex justify-content-center align-items-center h-100">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  monthlyPrices ? (
                    <canvas id="monthlyPriceChart" width="400" height="400"></canvas>
                  ) : (
                    <div className="d-flex justify-content-center align-items-center h-100">
                      <p className="text-muted">Click "Generate Monthly Prices" to see price data</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyAveragePrices;