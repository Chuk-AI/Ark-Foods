import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import * as XLSX from 'xlsx';
import 'chartjs-adapter-date-fns';
import '../styles/harvestPlanning.css';

// Add candlestick chart plugin registration
import {
  CandlestickController,
  CandlestickElement,
  OhlcController,
  OhlcElement
} from 'chartjs-chart-financial';

// Register the financial chart components
Chart.register(CandlestickController, CandlestickElement, OhlcController, OhlcElement);

const VolatilityChart = () => {
  const [volatilityChart, setVolatilityChart] = useState(null);
  const [volatilityData, setVolatilityData] = useState(null);
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
  // Add this near your other state declarations
  const [latestPrice, setLatestPrice] = useState({
    price: 0,
    date: ''
  });
  
  
  // New date range filters
  const [dateRangeFilter, setDateRangeFilter] = useState({
    startDate: '2022-01-01', // Jan 1 of current year
    endDate: new Date().toISOString().split('T')[0] // Today
  });
  
  // Volatility Data States
  const [volatilityFilterState, setVolatilityFilterState] = useState({
    commodity: 'Poblano', // Only ONE commodity at a time
    cities: [...citiesList],
    timeFrame: '1m', // Default time frame: 1 month
    ...dateRangeFilter
  });

  const [appliedVolatilityFilters, setAppliedVolatilityFilters] = useState({
    commodity: 'Poblano', 
    cities: [...citiesList],
    timeFrame: '1m',
    startDate: "2022-01-01",
    endDate: "2025-12-31"
  });

  const [viewType, setViewType] = useState('candlestick'); // 'candlestick' or 'volatility'
  const volatilityChartRef = useRef(null);


// Add this new useEffect to handle resizing when time frame changes
useEffect(() => {
  if (volatilityChart && volatilityData) {
    const resize = () => {
      const baseWidth = volatilityChartRef.current.parentNode.parentNode.offsetWidth;
      const dataLength = volatilityData.labels.length;
      
      // Different width per point based on time frame
      const pointWidth = viewType === 'candlestick' ? 
        (appliedVolatilityFilters.timeFrame === '1m' ? 70 : 
         appliedVolatilityFilters.timeFrame === '14d' ? 40 :
         appliedVolatilityFilters.timeFrame === '7d' ? 30 :
         appliedVolatilityFilters.timeFrame === '3d' ? 25 : 20) : 0;
      
      // Set width appropriately
      const newWidth = Math.max(baseWidth, dataLength * pointWidth);
      
      // Only apply scrollable width if needed
      volatilityChartRef.current.parentNode.style.width = 
        (dataLength <= 12 || viewType !== 'candlestick') ? 
        '100%' : `${newWidth}px`;
        
      volatilityChart.update('none');
    };
    
    // Call resize immediately
    resize();
  }
}, [appliedVolatilityFilters.timeFrame, volatilityChart, volatilityData, viewType]);

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

  // Handle date range changes
  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRangeFilter(prev => ({
      ...prev,
      [name]: value
    }));
    
    setVolatilityFilterState(prev => ({
      ...prev,
      [name]: value
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
    
    // Reset chart width before fetching new data
    if (volatilityChartRef.current && volatilityChartRef.current.parentNode) {
      // Destroy the old chart completely
      if (volatilityChart) {
        volatilityChart.destroy();
        setVolatilityChart(null);
      }
      
      // Reset container width immediately
      volatilityChartRef.current.parentNode.style.transition = "none";
      volatilityChartRef.current.parentNode.style.width = "100%";
    }
    
    fetchVolatilityData(newFilters);
  };

  // Handle view type change
  const handleViewTypeChange = (e) => {
    setViewType(e.target.value);
    if (volatilityData) {
      updateVolatilityChart(volatilityData, e.target.value);
    }
  };

  const formatCandlestickData = (chartData, timeFrame) => {
    const labels = chartData.labels;
    const candlestickData = [];
    
    // Check if we have all required datasets
    if (!chartData.datasets || chartData.datasets.length < 4) {
      console.error('Not enough datasets for candlestick chart');
      return [];
    }
    
    // Extract all datasets
    const minDataset = chartData.datasets[0].data;
    const maxDataset = chartData.datasets[1].data;
    const openDataset = chartData.datasets[2].data;
    const closeDataset = chartData.datasets[3].data;
    
    for (let i = 0; i < labels.length; i++) {
      // Get all prices for this period
      const minPrice = parseFloat(minDataset[i]) || 0;
      const maxPrice = parseFloat(maxDataset[i]) || 0;
      const openPrice = parseFloat(openDataset[i]) || 0;
      const closePrice = parseFloat(closeDataset[i]) || 0;
      
      // Only create valid candlestick data if we have all values
      if (minPrice > 0 && maxPrice > 0 && openPrice > 0 && closePrice > 0) {
        // Create the candlestick data point
        candlestickData.push({
          x: i,
          o: openPrice,
          h: maxPrice,
          l: minPrice, 
          c: closePrice
        });
      }
    }
    
    return candlestickData;
  };
  const updateVolatilityChart = (chartData, chartViewType = viewType) => {
    if (chartData.labels && chartData.labels.length && 
      chartData.datasets && chartData.datasets.length >= 2) {
    // Get the last index in the datasets
  }

    if (!volatilityChartRef.current) {
      console.error('Canvas element not found');
      return;
    }

    const ctx = volatilityChartRef.current.getContext('2d');

    // 2) Destroy old chart if it exists
    if (volatilityChart) {
      volatilityChart.destroy();
    }
    // We'll add this as a custom dataset for volatility view
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
          type: 'line',
          // Add this to disable point labels
          pointLabels: {
            display: false
          },
          datalabels: {
            display: false
          }
        });
      }
    }

    let newChart;
    
    if (chartViewType === 'candlestick') {
      // Format data for candlestick chart
      const candlestickData = formatCandlestickData(chartData, appliedVolatilityFilters.timeFrame);
      
      // Set up the candlestick chart
      const candlestickOptions = {
        type: 'candlestick',
        data: {
          labels: chartData.labels,
          datasets: [{
            label: `${appliedVolatilityFilters.commodity} Price Movement`,
            data: candlestickData,
            color: {
              up: 'rgba(75, 192, 75, 1)',
              down: 'rgba(255, 99, 132, 1)',
              unchanged: 'rgba(90, 90, 90, 1)',
            },
            barPercentage: 0.8,
            categoryPercentage: 0.8,
          
            pointLabels: {
              display: false  // This will hide the labels on the candlesticks
            },
            datalabels: {
              display: false  // This covers another possible source of labels
            }
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: { left: 10, right: 10 }
          },
            // Set a minimum width for the chart based on data points
          onResize: (chart, size) => {
            // Calculate minimum width based on number of candlesticks
            // Each candlestick needs about 20px of width for good visibility
            const minWidth = Math.max(size.width, candlestickData.length * 20);
            chart.canvas.parentNode.style.width = `${minWidth}px`;
          },
          scales: {
            x: {
              type: 'category',
              labels: chartData.labels,
              ticks: {
                maxRotation: 45,
                minRotation: 0,
                maxTicksLimit: Math.min(12, chartData.labels.length), // Limit number of ticks
                autoSkip: true,
                autoSkipPadding: 10
              },
              title: {
                display: true,
                text: 'Date',
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
                title: (context) => {
                  const index = context[0].dataIndex;
                  return chartData.labels[index];
                },
                
                label: (context) => {
                  const item = context.raw;
                  const isGreen = item.o <= item.c;
                  return [
                    `Open: $${item.o.toFixed(2)}`,
                    `High: $${item.h.toFixed(2)}`,
                    `Low: $${item.l.toFixed(2)}`,
                    `Close: $${item.c.toFixed(2)}`,
                    ``,
                    `Movement: ${isGreen ? '▲ Up' : '▼ Down'}`,
                    `Volatility: ${((item.h - item.l) / item.l * 100).toFixed(2)}%`
                  ];
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
            // Disable any data labels at the plugin level
            datalabels: {
              display: false
            }
          },
          interaction: {
            mode: 'index',
            intersect: false,
            axis: 'x'  // Add this line
          },
        },
      };

      
      newChart = new Chart(ctx, candlestickOptions);
    } else if (chartViewType === 'volatility') {
      // Set up the volatility percentage chart
      const percentageOptions = {
        type: 'line',
        data: {
          labels: chartData.labels,
          datasets: percentageDatasets.map(dataset => ({
            ...dataset,
            // Add this to each dataset to disable point labels
            pointLabels: {
              display: false
            },
            datalabels: {
              display: false
            }
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: appliedVolatilityFilters.timeFrame === '1m' ? 'Month' : 'Date',
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
            // Disable data labels at plugin level
            datalabels: {
              display: false
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
            axis: 'x'
          },
        },
      };
      
      newChart = new Chart(ctx, percentageOptions);
    } else {
      // Set up the original price range chart as a fallback
      const priceRangeOptions = {
        type: 'line',
        data: {
          labels: chartData.labels,
          datasets: chartData.datasets.map(dataset => ({
            ...dataset,
            // Add this to each dataset to disable point labels
            pointLabels: {
              display: false
            },
            datalabels: {
              display: false
            }
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: appliedVolatilityFilters.timeFrame === '1m' ? 'Month' : 'Date',
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
            },
            // Disable data labels at plugin level
            datalabels: {
              display: false
            }
          },
          interaction: {
            mode: 'index',
            intersect: false,
            axis: 'x'
          },
        },
      };
      
      newChart = new Chart(ctx, priceRangeOptions);
    }
    
    setVolatilityChart(newChart);

    if (volatilityChartRef.current && volatilityChartRef.current.parentNode) {
      // Calculate appropriate width based on number of data points and time frame
      const baseWidth = volatilityChartRef.current.parentNode.parentNode.offsetWidth;
      const dataLength = chartData.labels.length;
      
      // Set minimum width per candlestick based on time frame
      const pointWidth = chartViewType === 'candlestick' ? 
        (appliedVolatilityFilters.timeFrame === '1m' ? 70 : 
         appliedVolatilityFilters.timeFrame === '14d' ? 40 :
         appliedVolatilityFilters.timeFrame === '7d' ? 30 :
         appliedVolatilityFilters.timeFrame === '3d' ? 25 : 20) : 0;
      
      // Calculate new width - ensure at least 100% width
      const newWidth = Math.max(baseWidth, dataLength * pointWidth);
      
      // Set width with a small delay to ensure chart is fully rendered
      setTimeout(() => {
        volatilityChartRef.current.parentNode.style.width = 
          (dataLength <= 12 || chartViewType !== 'candlestick') ? 
          '100%' : `${newWidth}px`;
        
        // Force chart update
        newChart.update('none'); // Use 'none' for performance
      }, 50);
    }
  };

  const fetchVolatilityData = async (filters) => {
    const { commodity, cities, timeFrame, startDate, endDate } = filters;
  
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token found');
  
      // Create URL with query parameters correctly
      const url = new URL('/api/volatility_data', window.location.origin);
      url.searchParams.append('commodity', commodity);
      url.searchParams.append('cities', cities.join(','));
      url.searchParams.append('timeFrame', timeFrame);
      url.searchParams.append('startDate', startDate);
      url.searchParams.append('endDate', endDate);
  
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
      
      // Extract latest price data if available
      if (data.latest_price) {
        setLatestPrice(data.latest_price);
      }
      
      setVolatilityData(data); // Save data for export
      updateVolatilityChart(data, viewType);
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
    // Update applied filters with date range
    const newFilters = {
      ...volatilityFilterState,
      startDate: dateRangeFilter.startDate,
      endDate: dateRangeFilter.endDate
    };
    
    setAppliedVolatilityFilters(newFilters); // Apply current filter state
    fetchVolatilityData(newFilters); // Fetch data using new filters
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
            <div className="card-body" style={{height:'600px', overflowY: 'auto'}}>
              <form id="filters-volatility-data" className="filter-form active">
                {/* View Type Selection */}
                <div className="form-group">
                  <label className="font-weight-bold">View Type</label>
                  <select 
                    id="viewType"
                    className="form-control"
                    value={viewType}
                    onChange={handleViewTypeChange}
                  >
                    <option value="candlestick">Candlestick Chart</option>
                    <option value="volatility">Volatility Percentage</option>
                    <option value="priceRange">Price Range</option>
                  </select>
                </div>

                {/* Date Range Filters */}
                <div className="form-group">
                  <label className="font-weight-bold">Date Range</label>
                  <div className="row">
                    <div className="col-6">
                      <label className="small">Start Date</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        name="startDate" 
                        value={dateRangeFilter.startDate}
                        onChange={handleDateRangeChange}
                      />
                    </div>
                    <div className="col-6">
                      <label className="small">End Date</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        name="endDate" 
                        value={dateRangeFilter.endDate}
                        onChange={handleDateRangeChange}
                      />
                    </div>
                  </div>
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
              {/* <p className="text-muted">
                <i className="fas fa-info-circle"></i> {viewType === 'candlestick' ? 
                  "This chart shows price movement in candlestick format. Each candle represents price data for the selected time period. The body shows opening and closing prices, while wicks show the high and low prices." : 
                  "This chart shows price volatility as percentage fluctuations. Higher percentages indicate greater market instability and risk."}
                Use the time frame buttons above to adjust the data granularity.
              </p> */}
            
            {/* Add this below the description paragraph and above the chart container */}
            <div className="latest-price-container bg-light p-3 mb-4 border rounded shadow-sm">
  <div className="d-flex justify-content-between align-items-center">
  
    <div>
      <span className="badge badge-success" style={{ 
        fontSize: '16px', 
        padding: '8px 12px', 
        backgroundColor: 'gray', 
        color: 'white', 
        fontWeight: 'bold' 
      }}>
        ${latestPrice.price} {latestPrice.date && <span className="text-white ml-1">({latestPrice.date})</span>}
      </span>
    </div>
  </div>
</div>

              <div className="volatility-container" style={{ height: '450px', overflowY: 'hidden', overflowX: 'auto' }}>
                                <canvas id="volatilityChart" ref={volatilityChartRef} className="fixed-chart"></canvas>
              </div>
            </div>
           
          </div>
          <div className="mt-3 d-flex justify-content-end">
            <button className="btn btn-primary" onClick={handleDownload}>
              <i className="fas fa-download mr-2"></i> Download Chart & Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VolatilityChart;