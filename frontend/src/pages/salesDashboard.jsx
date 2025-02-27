import React from 'react';
import Chart from 'chart.js/auto';
import 'chartjs-plugin-datalabels';
import 'chartjs-adapter-moment';
import 'chartjs-adapter-luxon';
import L from 'leaflet'; // For Leaflet maps
import 'leaflet/dist/leaflet.css';
import XLSX from 'xlsx'; // For handling Excel files
import moment from 'moment'; // For date-time handling
import { useEffect, useState, useRef } from 'react';
import Header from '../components/header';
import Footer from '../components/footer';
import '../styles/sales_styles.css';
import Plot from 'react-plotly.js';
import EmpiricalChart from '../components/empirical';

function SalesDashboard() {
  const [commodities, setCommodities] = useState([]);
  const [cities, setCities] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // const [seasonalChart, setSeasonalChart] = useState(null);
  // const [commodity, setCommodity] = useState('Anaheim');
  const [shippingPrices, setShippingPrices] = useState({});

  const [source, setSource] = useState('Both');
  const [last7Days, setLast7Days] = useState(false);
  const [bestMarketData, setBestMarketData] = useState([]);
  // const [chartInstance, setChartInstance] = useState(null);
  const [currentSectionTitle, setCurrentSectionTitle] = useState('Most Recent Price');
  const [filters, setFilters] = useState({
    mostRecentPrice: true,
    bestSellMarket: false,
    map: false,
    seasonalTrends: false,
    historicalData: false,
    shippingPointPrice: false,
  });

  const [minimizedBlocks, setMinimizedBlocks] = useState([]);
  const sidebarRef = useRef(null);
  const rightSidebarRef = useRef(null);
  const [prices, setPrices] = useState({});
  // const [selectedCommodity, setSelectedCommodity] = useState('Anaheim');
  const [averageCommodities, setAverageCommodities] = useState(false);
  const [averageCities, setAverageCities] = useState(false);
  const [historicalChart, setHistoricalChart] = useState(null);
  const [violinData, setViolinData] = useState([]);

  const [shippingPointPriceChart, setShippingPointPriceChart] = useState(null);

  const [filterState, setFilterState] = useState({
    commodity: 'Anaheim',
    source: 'USDA',
    last7Days: false,
  });

  const [appliedFilters, setAppliedFilters] = useState({
    commodity: 'Anaheim',
    source: 'USDA',
    last7Days: false,
  });

  // Historical Data States
  const [historicalFilterState, setHistoricalFilterState] = useState({
    commodities: ['Anaheim'], // Default to one or more items
    cities: ['New York'], // Default to one or more items
    source: 'USDA',
    startDate: '2024-10-01', // Default to a valid date
    endDate: new Date().toISOString().split('T')[0], // current day as endDate
    averageCommodities: false,
    averageCities: false,
  });

  const [appliedHistoricalFilters, setAppliedHistoricalFilters] = useState({
    commodities: ['Anaheim'],
    cities: ['New York'],
    source: 'USDA',
    startDate: '2024-11-01',
    endDate: new Date().toISOString().split('T')[0], // current day as endDate
    averageCommodities: false,
    averageCities: false,
  });



  // best sell market
  const handleCommodityChange = (e) => {
    setFilterState((prev) => ({ ...prev, commodity: e.target.value }));
  };

  const handleSourceChange = (e) => {
    setFilterState((prev) => ({ ...prev, source: e.target.value }));
  };

  const handleLast7DaysChange = (e) => {
    setFilterState((prev) => ({ ...prev, last7Days: e.target.checked }));
  };

  // historical data
  const handleHistoricalCommodityChange = (e) => {
    setHistoricalFilterState((prev) => ({
      ...prev,
      commodities: Array.from(e.target.selectedOptions, (opt) => opt.value),
    }));
  };

  const handleHistoricalCityChange = (e) => {
    setHistoricalFilterState((prev) => ({
      ...prev,
      cities: Array.from(e.target.selectedOptions, (opt) => opt.value),
    }));
  };

  const handleHistoricalSourceChange = (e) => {
    setHistoricalFilterState((prev) => ({ ...prev, source: e.target.value }));
  };

  const handleHistoricalStartDateChange = (e) => {
    setHistoricalFilterState((prev) => ({ ...prev, startDate: e.target.value }));
  };

  const handleHistoricalEndDateChange = (e) => {
    setHistoricalFilterState((prev) => ({ ...prev, endDate: e.target.value }));
  };

  const handleAverageCommoditiesChange = (e) => {
    setHistoricalFilterState((prev) => ({
      ...prev,
      averageCommodities: e.target.checked,
    }));
  };

  const handleAverageCitiesChange = (e) => {
    setHistoricalFilterState((prev) => ({
      ...prev,
      averageCities: e.target.checked,
    }));
  };

  // Shipping Point Price Data States
  const [shippingPointFilterState, setShippingPointFilterState] = useState({
    commodities: ['Habanero'], // Default to one or more items
    regions: ['mexico crossings through texas'], // Default to one or more regions
    source: 'ProduceIQ', // Default source for shipping point price
    startDate: '2024-11-01', // Default to a valid date
    endDate: new Date().toISOString().split('T')[0], // current day as endDate
    averageCommodities: false,
    averageRegions: false,
  });

  const [appliedShippingPointFilters, setAppliedShippingPointFilters] = useState({
    commodities: ['Anaheim'],
    regions: ['Central and South Florida'],
    source: 'ProduceIQ',
    startDate: '2024-11-01',
    endDate: new Date().toISOString().split('T')[0], // current day as endDate
    averageCommodities: false,
    averageRegions: false,
  });

  // Handlers for Shipping Point Price
  const handleShippingCommodityChange = (e) => {
    setShippingPointFilterState((prev) => ({
      ...prev,
      commodities: Array.from(e.target.selectedOptions, (opt) => opt.value),
    }));
  };

  const handleShippingRegionChange = (e) => {
    setShippingPointFilterState((prev) => ({
      ...prev,
      regions: Array.from(e.target.selectedOptions, (opt) => opt.value),
    }));
  };

  const handleShippingSourceChange = (e) => {
    setShippingPointFilterState((prev) => ({ ...prev, source: e.target.value }));
  };

  const handleShippingStartDateChange = (e) => {
    setShippingPointFilterState((prev) => ({ ...prev, startDate: e.target.value }));
  };

  const handleShippingEndDateChange = (e) => {
    setShippingPointFilterState((prev) => ({ ...prev, endDate: e.target.value }));
  };

  const handleAverageShippingCommoditiesChange = (e) => {
    setShippingPointFilterState((prev) => ({
      ...prev,
      averageCommodities: e.target.checked,
    }));
  };

  const handleAverageShippingRegionsChange = (e) => {
    setShippingPointFilterState((prev) => ({
      ...prev,
      averageRegions: e.target.checked,
    }));
  };

  const [seasonalFilterState, setSeasonalFilterState] = useState({
    commodities: ['Anaheim'], // Default commodity
    cities: ['New York'], // Default city
    startDate: '2024-01-01', // Default start date
    endDate: new Date().toISOString().split('T')[0], // Current date as end date
  });

  const [appliedSeasonalFilters, setAppliedSeasonalFilters] = useState({
    commodities: ['Anaheim'],
    cities: ['New York'],
    startDate: '2024-01-01',
    endDate: new Date().toISOString().split('T')[0],
  });

  const handleSeasonalCommodityChange = (e) => {
    setSeasonalFilterState((prev) => ({
      ...prev,
      commodities: Array.from(e.target.selectedOptions, (opt) => opt.value),
    }));
  };

  const handleSeasonalCityChange = (e) => {
    setSeasonalFilterState((prev) => ({
      ...prev,
      cities: Array.from(e.target.selectedOptions, (opt) => opt.value),
    }));
  };

  const handleSeasonalStartDateChange = (e) => {
    setSeasonalFilterState((prev) => ({ ...prev, startDate: e.target.value }));
  };

  const handleSeasonalEndDateChange = (e) => {
    setSeasonalFilterState((prev) => ({ ...prev, endDate: e.target.value }));
  };

  // Section Titles
  const sectionTitles = {
    'best-sell-market-section': 'Best Sell Market',
    'seasonal-trends-section': 'Seasonal Trends',
    'historical-data-section': 'Historical Data',
    'most-recent-price-section': 'Most Recent Price',
    'shipping-point-price-section': 'Shipping Point Price',
    'terminal-voilin-plot-section': 'Terminal Voilin Plot',
    'shipping-voilin-plot-section': 'Shipping Voilin Plot',
    'terminal-empricial-probability-section': 'Terminal Empricial Probability',
  };

  // Update the Sidebar Section Title
  const updateSidebarSectionTitle = (sectionId) => {
    setCurrentSectionTitle(sectionTitles[sectionId] || 'Unknown Section');
  };

  //
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('You need to log in to access this dashboard.');
      window.location.href = '/login';
    }
  }, []);

  // Scroll Event Listener to Update Active Section
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('.section');
      const windowHeight = window.innerHeight;

      let currentSectionId = '';

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= windowHeight * 0.25 && rect.bottom >= windowHeight * 0.25) {
          currentSectionId = section.id;
        }
      });

      if (currentSectionId) {
        updateSidebarSectionTitle(currentSectionId);
        updateFiltersBasedOnSection(currentSectionId);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update Filters Based on Section
  const updateFiltersBasedOnSection = (sectionId) => {
    const updatedFilters = {
      mostRecentPrice: sectionId === 'most-recent-price-section',
      bestSellMarket: sectionId === 'best-sell-market-section',
      seasonalTrends: sectionId === 'seasonal-trends-section',
      historicalData: sectionId === 'historical-data-section',
      shippingPointPrice: sectionId === 'shipping-point-price-section',
    };

    setFilters(updatedFilters);
  };

  // Toggle Sidebar (Left Sidebar)
  const toggleSidebar = () => {
    const sidebar = sidebarRef.current;
    if (sidebar) {
      sidebar.classList.toggle('collapsed');
    }
  };

  // Toggle Right Sidebar and Manage Minimized Blocks
  const toggleRightSidebar = () => {
    const rightSidebar = rightSidebarRef.current;
    if (rightSidebar) {
      rightSidebar.classList.toggle('collapsed'); // Use 'collapsed' for consistency
    } else {
      console.log('');
    }
  };

  // Minimize/Maximize Block
  const toggleBlockSize = (blockId, blockTitle) => {
    setMinimizedBlocks((prev) => {
      if (prev.includes(blockId)) {
        // Restore the block
        const blockElement = document.getElementById(blockId);
        blockElement.classList.remove('hidden');
        return prev.filter((id) => id !== blockId); // Remove from minimizedBlocks
      } else {
        // Minimize the block

        const blockElement = document.getElementById(blockId);
        blockElement.classList.add('hidden');
        return [...prev, blockId]; // Add to minimizedBlocks
      }
    });
  };

  const fetchBestSellMarket = async (filters) => {
    const { commodity, source, last7Days } = filters;

    try {
      const token = localStorage.getItem('authToken'); // Retrieve JWT token
      if (!token) throw new Error('No token found');

      const response = await fetch(`/api/best_sell_market?commodity=${commodity}&source=${source}&last7Days=${last7Days}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('Session expired. Please log in again.');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        throw new Error('Failed to fetch Best Sell Market data');
      }

      const data = await response.json();
      setBestMarketData(data.best_market);
      updateBestSellChart(data.best_market);
    } catch (error) {
      console.error('Error fetching Best Sell Market data:', error);
    }
  };

  // Update Best Sell Market Chart
  const bestSellChartRef = useRef(null); // Ref for Best Sell Chart

  const updateBestSellChart = (data) => {
    const cityNames = data.map((item) => item.city_name);
    const maxPrices = data.map((item) => (item.max_price === '-' ? 0 : parseFloat(item.max_price)));

    const ctx = bestSellChartRef.current.getContext('2d');

    // Destroy existing chart instance
    if (bestSellChartRef.current.chart) {
      bestSellChartRef.current.chart.destroy();
    }

    // Create new chart instance
    const newChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: cityNames,
        datasets: [
          {
            label: 'Max Price',
            data: maxPrices,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: 'Price' }, beginAtZero: true },
          y: { title: { display: true, text: 'City' } },
        },
      },
    });

    bestSellChartRef.current.chart = newChart; // Save chart instance for cleanup
  };

  // Handle Apply Filters Button
  const handleApplyBestSellFilters = () => {
    setAppliedFilters(filterState); // Update applied filters
    fetchBestSellMarket(filterState); // Fetch data using new filters
  };

  // Fetch initial data on component mount
  useEffect(() => {
    fetchBestSellMarket(appliedFilters);
  }, []);

  useEffect(() => {
    updateSeasonalChart(appliedSeasonalFilters);
  }, []);

  // Fetch Most Recent Prices Data
  const fetchMostRecentPrices = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token found');

      const response = await fetch(`/api/most_recent_prices?source=${source}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('Session expired. Please log in again.');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        throw new Error('Failed to fetch most recent prices');
      }

      const data = await response.json();
      setPrices(data.prices);
    } catch (error) {
      console.error('Error fetching most recent prices:', error);
    }
  };

// for most recent price filters
const handleApplyMostRecentFilters = () => {
  // Just call fetchMostRecentPrices with the main `source` state
  fetchMostRecentPrices(source);
};

  

  const updateMostRecentPricesTable = () => {
    // console.log("Current Prices State:", prices); // Debug prices state

    const commodities = ['Anaheim', 'Cubanelles', 'Fresno', 'Habanero', 'Hungarian Wax', 'Jalapeno', 'Long Hot', 'Poblano', 'Serrano', 'Shishito'];
    const cities = ['Baltimore', 'Boston', 'Chicago', 'Columbia', 'Miami', 'New York', 'Philadelphia', 'Los Angeles'];

    return commodities.map((commodity) => {
      let maxPrice = -Infinity;
      let maxCity = null;

      cities.forEach((city) => {
        const price = parseFloat(prices[commodity]?.[city]);
        if (!isNaN(price) && price > maxPrice) {
          maxPrice = price;
          maxCity = city;
        }
      });

      return (
        <tr key={commodity}>
          <td>{commodity}</td>
          {cities.map((city) => {
            const price = prices[commodity]?.[city];
            const formattedPrice = price !== undefined && !isNaN(parseFloat(price)) ? `$${parseFloat(price).toFixed(2)}` : '-';
            const highlightClass = city === maxCity ? 'highlight-max' : '';
            return (
              <td key={city} className={highlightClass}>
                {formattedPrice}
              </td>
            );
          })}
        </tr>
      );
    });
  };

  const seasonalChartRef = useRef(null); // Ref for Seasonal Chart

  const updateSeasonalChart = async (filters = appliedSeasonalFilters) => {
    const params = new URLSearchParams();
    params.append('commodities', filters.commodities.join(','));
    params.append('cities', filters.cities.join(','));
    params.append('start_date', filters.startDate);
    params.append('end_date', filters.endDate);

    try {
      const response = await fetch(`/api/sales_seasonal_prices?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch seasonal data');

      const data = await response.json();
      const ctx = seasonalChartRef.current.getContext('2d');

      if (seasonalChartRef.current.chart) {
        seasonalChartRef.current.chart.destroy();
      }

      const newChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Spring', 'Summer', 'Autumn', 'Winter'],
          datasets: [
            {
              label: 'Average Seasonal Prices',
              data: [data.Spring || 0, data.Summer || 0, data.Autumn || 0, data.Winter || 0],
              backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
              borderWidth: 0.3,
              barPercentage: 0.4,
              categoryPercentage: 1,
            },
          ],
        },
        options: { responsive: true },
      });

      seasonalChartRef.current.chart = newChart;
    } catch (error) {
      console.error('Error fetching seasonal chart data:', error);
    }
  };

  const handleApplySeasonalFilters = () => {
    const { startDate, endDate } = seasonalFilterState;

    if ((startDate && !endDate) || (!startDate && endDate)) {
      alert('Please provide both start date and end date.');
      return;
    }

    setAppliedSeasonalFilters(seasonalFilterState); // Apply filters
    updateSeasonalChart(seasonalFilterState); // Fetch data using applied filters
  };

  // Fetch initial chart data on component mount
  useEffect(() => {
    updateSeasonalChart();
  }, []);

  const getColor = (index) => {
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#4BC0C0'];
    return colors[index % colors.length];
  };

  const historicalChartRef = useRef(null); // Add a reference for the canvas

  const updateHistoricalChart = (chartData) => {
    if (!historicalChartRef.current) {
      console.error('Canvas element not found');
      return;
    }

    const ctx = historicalChartRef.current.getContext('2d');

    if (historicalChart) {
      historicalChart.destroy();
    }

    if (!chartData.labels.length || !chartData.datasets.length) {
      alert('No historical data available for the selected criteria.');
      return;
    }

    const datasets = chartData.datasets.map((dataset, index) => ({
      ...dataset,
      fill: false,
      tension: 0.1,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      spanGaps: true,
      borderColor: dataset.borderColor || getColor(index),
      backgroundColor: dataset.backgroundColor || getColor(index),
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
              text: 'Date',
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
              title: (context) => moment(context[0].label).format('MMM D, YYYY'),
              label: (context) => `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`,
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

    setHistoricalChart(newChart);
  };

  const fetchHistoricalData = async (filters) => {
    const { commodities, cities, source, startDate, endDate, averageCommodities, averageCities } = filters;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token found');

      const response = await fetch(
        `/api/historical_data?commodities=${commodities.join(',')}&cities=${cities.join(
          ','
        )}&source=${source}&start_date=${startDate}&end_date=${endDate}&averageCommodities=${averageCommodities}&averageCities=${averageCities}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          alert('Session expired. Please log in again.');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        throw new Error('Failed to fetch historical data');
      }

      const data = await response.json();
      updateHistoricalChart(data);
    } catch (error) {}
  };

  const handleDownloadChart = () => {
    if (historicalChart) {
      const canvas = document.getElementById('historicalChart');
      const imageLink = document.createElement('a');
      imageLink.download = 'historical_prices_chart.png';
      imageLink.href = canvas.toDataURL('image/png');
      imageLink.click();
    }
  };

  useEffect(() => {
    fetchHistoricalData(appliedHistoricalFilters);
  }, []);

  useEffect(() => {
    // fetchHistoricalData();
  }, [commodities, cities, source, startDate, endDate, averageCommodities, averageCities]);

  useEffect(() => {
    return () => {
      if (bestSellChartRef.current?.chart) bestSellChartRef.current.chart.destroy();
      if (seasonalChartRef.current?.chart) seasonalChartRef.current.chart.destroy();
    };
  }, []);

  useEffect(() => {
    fetchMostRecentPrices();
  }, []); // Empty dependency array means it runs only once when the component mounts

  const handleApplyHistoricalFilters = () => {
    setAppliedHistoricalFilters(historicalFilterState); // Apply current filter state

    fetchHistoricalData(historicalFilterState); // Fetch data using new filters
  };

  const handleApplyShippingPointFilters = () => {
    setAppliedShippingPointFilters(shippingPointFilterState); // Apply current filter state

    fetchShippingPointPriceData(shippingPointFilterState); // Fetch data using new filters
  };

  useEffect(() => {
    if (filters.shippingPointPrice) {
      fetchShippingPointPriceData(shippingPointFilterState);
    }
  }, [filters.shippingPointPrice]);

  const shippingPointPriceChartRef = useRef(null);

  const updateShippingPointPriceChart = (chartData) => {
    if (!shippingPointPriceChartRef.current) {
      console.error('Canvas element not found');
      return;
    }

    const ctx = shippingPointPriceChartRef.current.getContext('2d');

    if (shippingPointPriceChart) {
      shippingPointPriceChart.destroy();
    }

    if (!chartData || !chartData.labels.length || !chartData.datasets.length) {
      alert('No data available for the Shipping Point Price chart.');
      return;
    }

    const datasets = chartData.datasets.map((dataset, index) => ({
      ...dataset,
      fill: false,
      tension: 0.1,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      spanGaps: true,
      borderColor: dataset.borderColor || getColor(index),
      backgroundColor: dataset.backgroundColor || getColor(index),
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
              text: 'Date',
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
              title: (context) => moment(context[0].label).format('MMM D, YYYY'),
              label: (context) => `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`,
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

    setShippingPointPriceChart(newChart);
  };

  const currentDate = new Date().toISOString().split('T')[0];

  const fetchShippingPointPriceData = async (filters = null) => {
    // Use default data if no filters are provided
    const defaultFilters = {
      commodities: ['Habanero'], // Default commodity for testing
      regions: ['mexico crossings through texas'], // Default region for testing
      source: 'ProduceIQ',
      startDate: '2024-10-01',
      endDate: new Date().toISOString().split('T')[0], // current day as endDate
    };

    const appliedFilters = filters || defaultFilters;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token found');

      const params = new URLSearchParams({
        commodities: appliedFilters.commodities.join(','),
        regions: appliedFilters.regions.join(','),
        source: appliedFilters.source,
        start_date: appliedFilters.startDate,
        end_date: appliedFilters.endDate,
        averageCommodities: appliedFilters.averageCommodities?.toString() || 'false',
        averageRegions: appliedFilters.averageRegions?.toString() || 'false',
      });

      const response = await fetch(`/api/shipping_point_price?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('Session expired. Please log in again.');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        throw new Error('Failed to fetch Shipping Point Price data');
      }

      const data = await response.json();
      updateShippingPointPriceChart(data); // Update chart with fetched data
    } catch (error) {}
  };

  // useEffect(() => {
  //   fetchShippingPointPriceData({
  //     commodities: ['Jalapeno'], // Default commodity for testing
  //     regions: ['mexico crossings through texas'], // Default region for testing
  //     source: 'ProduceIQ',
  //     startDate: '2020-01-01',
  //     endDate: '2024-12-31',
  //   });
  // }, []);
  useEffect(() => {
    fetchShippingPointPriceData(); // Fetch default data on mount
  }, []);

  return (
    <div>
      <Header />
      <div className="container-fluid d-flex">
        {/* Left Sidebar */}
        <div className="sidebar bg-light p-3" id="filters-sidebar" ref={sidebarRef}>
          <div id="sidebar-toggle" onClick={toggleSidebar}>
            <i className="icon">...</i>
          </div>
          <div id="filters-content">
            <h2 id="current-section-title">{currentSectionTitle}</h2>
            {/* Filters (conditionally rendered based on the active section) */}
            {filters.mostRecentPrice}
            {filters.bestSellMarket}
            {filters.seasonalTrends}
            {filters.historicalData}
            {filters.shippingPointPrice}



              {/* Filters for Most Recent Price */} 
              <form
                id="filters-most-recent"
                className={`filter-form ${filters.mostRecentPrice ? 'active' : 'd-none'}`}
              >
                <div className="form-group">
                  <label htmlFor="sourceFilterMostRecent" className="font-weight-bold">
                    Source
                  </label>
                  <select
                    id="sourceFilterMostRecent"
                    className="form-control"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  >
                    <option value="USDA">USDA</option>
                    <option value="ProduceIQ">ProduceIQ</option>
                    <option value="Both">Both</option>
                  </select>

                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={handleApplyMostRecentFilters}
                >
                  Apply Filters
                </button>
              </form>



            {/* Filters for Best Sell Market */}
            <form id="filters-best-sell-market" className={`filter-form ${filters.bestSellMarket ? 'active' : 'd-none'}`}>
              {/* Commodity Filter */}
              <div className="form-group">
                <label htmlFor="commodityFilterBestSell" className="font-weight-bold">
                  Commodity
                </label>
                <select id="commodityFilterBestSell" className="form-control" value={filterState.commodity} onChange={handleCommodityChange}>
                  {['Anaheim', 'Cubanelles', 'Fresno', 'Habanero', 'Hungarian Wax', 'Jalapeno', 'Long Hot', 'Poblano', 'Serrano', 'Shishito'].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Filter */}

              <div className="form-group">
                <label htmlFor="sourceFilterBestSell" className="font-weight-bold">
                  Source
                </label>
                <select
                  id="sourceFilterBestSell"
                  className="form-control"
                  value={filterState.source} // Ensure the dropdown reflects the state
                  onChange={handleSourceChange} // Update the state on selection
                >
                  {['USDA', 'ProduceIQ'].map((sourceOption) => (
                    <option key={sourceOption} value={sourceOption}>
                      {sourceOption}
                    </option>
                  ))}
                </select>
              </div>

              {/* Last 7 Days Checkbox */}
              <div className="form-group form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="last7DaysBestSell"
                  checked={filterState.last7Days} // Bind the checkbox to the state
                  onChange={handleLast7DaysChange} // Update the state on change
                />
                <label className="form-check-label font-weight-bold" htmlFor="last7DaysBestSell">
                  Only Last 7 Days
                </label>
              </div>

              {/* Apply Filters Button */}
              <button type="button" className="btn btn-primary btn-block" onClick={handleApplyBestSellFilters}>
                Apply Filters
              </button>
            </form>

            {/* Filters for Seasonal Trends */}
            <form id="filters-seasonal-trends" className={`filter-form ${filters.seasonalTrends ? 'active' : 'd-none'}`}>
              <div className="form-group">
                <label htmlFor="commodityFilterSeasonal" className="font-weight-bold">
                  Commodity
                </label>
                <select
                  id="commodityFilterSeasonal"
                  className="form-control"
                  value={seasonalFilterState.commodities}
                  onChange={handleSeasonalCommodityChange}
                  multiple
                >
                  {['Anaheim', 'Cubanelles', 'Fresno', 'Habanero', 'Hungarian Wax', 'Jalapeno', 'Long Hot', 'Poblano', 'Serrano', 'Shishito'].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="cityFilterSeasonal" className="font-weight-bold">
                  City
                </label>
                <select id="cityFilterSeasonal" className="form-control" value={seasonalFilterState.cities} onChange={handleSeasonalCityChange} multiple>
                  {['New York', 'Chicago', 'Los Angeles', 'Miami', 'Philadelphia', 'Boston', 'Baltimore', 'Columbia'].map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="startDateFilterSeasonal" className="font-weight-bold">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDateFilterSeasonal"
                  className="form-control"
                  value={seasonalFilterState.startDate}
                  onChange={handleSeasonalStartDateChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="endDateFilterSeasonal" className="font-weight-bold">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDateFilterSeasonal"
                  className="form-control"
                  value={seasonalFilterState.endDate}
                  onChange={handleSeasonalEndDateChange}
                />
              </div>

              <button type="button" className="btn btn-primary btn-block" onClick={handleApplySeasonalFilters}>
                Apply Filters
              </button>
            </form>

            <form id="filters-historical-data" className={`filter-form ${filters.historicalData ? 'active' : 'd-none'}`}>
              {/* Commodity Multi-Select Filter */}
              <div className="form-group">
                <label htmlFor="commodityFilterHistorical" className="font-weight-bold">
                  Commodity
                </label>
                <select
                  id="commodityFilterHistorical"
                  className="form-control"
                  value={historicalFilterState.commodities}
                  onChange={handleHistoricalCommodityChange}
                  multiple
                >
                  {['Anaheim', 'Cubanelles', 'Fresno', 'Habanero', 'Hungarian Wax', 'Jalapeno', 'Long Hot', 'Poblano', 'Serrano', 'Shishito'].map(
                    (commodity) => (
                      <option key={commodity} value={commodity}>
                        {commodity}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-group form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="averageCommodities"
                  checked={historicalFilterState.averageCommodities}
                  // Bind to the state
                  onChange={handleAverageCommoditiesChange}
                />
                <label className="form-check-label font-weight-bold" htmlFor="averageCommodities">
                  Average over Commodities
                </label>
              </div>

              {/* City Multi-Select Filter */}
              <div className="form-group">
                <label htmlFor="cityFilterHistorical" className="font-weight-bold">
                  City
                </label>
                <select id="cityFilterHistorical" className="form-control" multiple value={historicalFilterState.cities} onChange={handleHistoricalCityChange}>
                  {['New York', 'Chicago', 'Los Angeles', 'Miami', 'Philadelphia', 'Boston', 'Baltimore', 'Columbia'].map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="averageCities"
                  checked={historicalFilterState.averageCities}
                  // Bind to the state
                  onChange={handleAverageCitiesChange}
                />
                <label className="form-check-label font-weight-bold" htmlFor="averageCities">
                  Average over Cities
                </label>
              </div>

              {/* Source Filter */}
              <div className="form-group">
                <label htmlFor="sourceFilterHistorical" className="font-weight-bold">
                  Source
                </label>
                <select id="sourceFilterHistorical" className="form-control" value={historicalFilterState.source} onChange={handleHistoricalSourceChange}>
                  {['USDA', 'ProduceIQ'].map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date Filter */}
              <div className="form-group">
                <label htmlFor="startDateFilterHistorical" className="font-weight-bold">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDateFilterHistorical"
                  className="form-control"
                  placeholder="YYYY-MM-DD"
                  value={historicalFilterState.startDate}
                  onChange={handleHistoricalStartDateChange}
                />
              </div>

              {/* End Date Filter */}
              <div className="form-group">
                <label htmlFor="endDateFilterHistorical" className="font-weight-bold">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDateFilterHistorical"
                  className="form-control"
                  placeholder="YYYY-MM-DD"
                  value={historicalFilterState.endDate}
                  onChange={handleHistoricalEndDateChange}
                />
              </div>

              {/* Apply Filters Button */}
              <button type="button" className="btn btn-primary btn-block" onClick={handleApplyHistoricalFilters}>
                Apply Filters
              </button>
            </form>

            <form id="filters-shipping-point-price" className={`filter-form ${filters.shippingPointPrice ? 'active' : 'd-none'}`}>
              <div className="form-group">
                <label htmlFor="commodityFilterShipping" className="font-weight-bold">
                  Commodity
                </label>
                <select
                  id="commodityFilterShipping"
                  className="form-control"
                  value={shippingPointFilterState.commodities}
                  onChange={handleShippingCommodityChange}
                  multiple
                >
                  {['Anaheim', 'Cubanelles', 'Fresno', 'Habanero', 'Hungarian Wax', 'Jalapeno', 'Long Hot', 'Poblano', 'Serrano', 'Shishito'].map(
                    (commodity) => (
                      <option key={commodity} value={commodity}>
                        {commodity}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-group form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="averageShippingCommodities"
                  checked={shippingPointFilterState.averageCommodities}
                  onChange={handleAverageShippingCommoditiesChange}
                />
                <label className="form-check-label font-weight-bold" htmlFor="averageShippingCommodities">
                  Average over Commodities
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="regionFilterShipping" className="font-weight-bold">
                  Region
                </label>
                <select
                  id="regionFilterShipping"
                  className="form-control"
                  multiple
                  value={shippingPointFilterState.regions}
                  onChange={handleShippingRegionChange}
                >
                  {['Central and South Florida', 'south georgia', 'mexico crossings through texas', 'mexico crossings through nogales arizona', 'Virginia'].map(
                    (region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-group form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="averageRegions"
                  checked={shippingPointFilterState.averageRegions}
                  onChange={handleAverageShippingRegionsChange}
                />
                <label className="form-check-label font-weight-bold" htmlFor="averageRegions">
                  Average over Regions
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="sourceFilterShipping" className="font-weight-bold">
                  Source
                </label>
                <select id="sourceFilterShipping" className="form-control" value={shippingPointFilterState.source} onChange={handleShippingSourceChange}>
                  {['ProduceIQ', 'USDA'].map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="startDateFilterShipping" className="font-weight-bold">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDateFilterShipping"
                  className="form-control"
                  placeholder="YYYY-MM-DD"
                  value={shippingPointFilterState.startDate}
                  onChange={handleShippingStartDateChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="endDateFilterShipping" className="font-weight-bold">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDateFilterShipping"
                  className="form-control"
                  placeholder="YYYY-MM-DD"
                  value={shippingPointFilterState.endDate}
                  onChange={handleShippingEndDateChange}
                />
              </div>

              <button type="button" className="btn btn-primary btn-block" onClick={handleApplyShippingPointFilters}>
                Apply Filters
              </button>
            </form>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content flex-grow-1">
          <div id="most-recent-price-section" className="section">
            <div className="row mb-4 salesBody most-recent-container">
              <div className="col-12 mb-4">
                <div className="card resizable-block" id="most-recent-prices-card" data-block-title="Most Recent Prices">
                  <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h2>Most Recent Prices</h2>
                    <button
                      className="btn btn-sm btn-outline-light toggle-size"
                      data-block-title="Most Recent Prices"
                      onClick={() => toggleBlockSize('most-recent-prices-card', 'Most Recent Prices')}
                    >
                      Minimize
                    </button>
                  </div>
                  <div className="card-body p-0">
                    <table className="table table-striped table-hover table-bordered" id="most-recent-prices-table">
                      <thead className="thead-dark">
                        <tr>
                          <th>Commodity</th>
                          <th>Baltimore</th>
                          <th>Boston</th>
                          <th>Chicago</th>
                          <th>Columbia</th>
                          <th>Miami</th>
                          <th>New York</th>
                          <th>Philadelphia</th>
                          <th>Los Angeles</th>
                        </tr>
                      </thead>
                      <tbody>{updateMostRecentPricesTable()}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="best-sell-market-section" className="section">
            <div className="row mb-4 sales-Body">
              {/* Best Sell Market Table */}
              <div className="col-lg-6 mb-4">
                <div className="card resizable-block" id="best-sell-market-card" data-block-title="Best Sell Market">
                  <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h2>Best Sell Market</h2>
                    {/* <button
                className="btn btn-sm btn-outline-light toggle-size"
                data-block-title="Best Sell Market"
              >
                Minimize
              </button> */}
                    <button className="btn btn-sm btn-outline-light toggle-size" onClick={() => toggleBlockSize('best-sell-market-card', 'Best Sell Market')}>
                      Minimize
                    </button>
                  </div>
                  <div className="card-body p-0">
                    <table className="table table-striped table-hover table-bordered" id="best-sell-market-table">
                      <thead className="thead-dark">
                        <tr>
                          <th>City</th>
                          <th>Price</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bestMarketData && bestMarketData.length > 0 ? (
                          bestMarketData.map((item, index) => (
                            <tr key={index}>
                              <td>{item.city_name}</td>
                              <td>{item.max_price !== '-' ? `$${parseFloat(item.max_price).toFixed(2)}` : '-'}</td>
                              <td>{item.date || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3" className="text-center">
                              No data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              {/* Market Graph */}
              <div className="col-lg-6 mb-4">
                <div className="card resizable-block" id="market-graph-card" data-block-title="Market Graph">
                  <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h2>Market Graph</h2>
                    <button
                      className="btn btn-sm btn-outline-light toggle-size"
                      data-block-title="Market Graph"
                      onClick={() => toggleBlockSize('market-graph-card', 'Market Graph')}
                    >
                      Minimize
                    </button>
                  </div>
                  <div className="card-body">
                    {/* <canvas id="bestSellChart" width="400" height="400"></canvas> */}
                    <canvas id="bestSellChart" ref={bestSellChartRef} width="400" height="400"></canvas>
                  </div>
                </div>
              </div>
              {/* Row 2: Most Recent Prices Table */}

              {/* Seasonal Trends */}
              <div id="seasonal-trends-section" className="section">
                <div className="col-lg-12 mb-4">
                  <div className="card resizable-block" id="seasonal-trends-card" data-block-title="Seasonal Trends">
                    <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                      <h2>Seasonal Trends</h2>
                      <button
                        className="btn btn-sm btn-outline-light toggle-size"
                        data-block-title="Seasonal Trends"
                        onClick={() => toggleBlockSize('seasonal-trends-card', 'Seasonal Trends')}
                      >
                        Minimize
                      </button>
                    </div>
                    <div className="card-body seasonal-body">
                      <canvas id="seasonalChart" ref={seasonalChartRef} width="100" height="100"></canvas>
                    </div>
                  </div>
                </div>
              </div>
              {/* Row 4: Historical Data */}
              <div id="historical-data-section" className="section">
                <div className="row mb-4 salesBody">
                  <div className="col-12 mb-4">
                    <div className="card resizable-block" id="historical-data-card" data-block-title="Historical Data">
                      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <h2>Historical Data</h2>
                        <button
                          className="btn btn-sm btn-outline-light toggle-size"
                          data-block-title="Historical Data"
                          onClick={() => toggleBlockSize('historical-data-card', 'Historical Data')}
                        >
                          Minimize
                        </button>
                      </div>
                      <div className="card-body ">
                        <canvas id="historicalChart" ref={historicalChartRef} width="400" height="400"></canvas>
                        <button className="btn btn-primary mt-3" onClick={handleDownloadChart}>
                          Download Chart & Data
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Shipping Point Price */}
              <div id="shipping-point-price-section" className="section">
                <div className="row mb-4 salesBody">
                  <div className="col-12 mb-4">
                    <div className="card resizable-block" id="shipping-point-price-card" data-block-title="Shipping Point Price">
                      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <h2>Shipping Point Price</h2>
                        <button
                          className="btn btn-sm btn-outline-light toggle-size"
                          data-block-title="Shipping Point Price"
                          onClick={() => toggleBlockSize('shipping-point-price-card', 'Shipping Point Price')}
                        >
                          Minimize
                        </button>
                      </div>
                      <div className="card-body">
                        <canvas id="shippingPointPriceChart" ref={shippingPointPriceChartRef} width="400" height="400"></canvas>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div ref={rightSidebarRef} id="minimized-sidebar" className=" collapsed">
                <div id="right-sidebar-toggle" onClick={toggleRightSidebar}>
                  <i className="rightbar-icon">...</i>
                </div>
                <h2>Minimized Blocks</h2>
                <ul id="minimized-list">
                  {minimizedBlocks.map((blockId) => (
                    <li
                      key={blockId}
                      onClick={() => toggleBlockSize(blockId, '')} // Pass blockId to restore the block
                      className="minimized-item"
                    >
                      {document.getElementById(blockId)?.dataset?.blockTitle || blockId}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default SalesDashboard;























// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import Chart from 'chart.js/auto';
// import ChartDataLabels from 'chartjs-plugin-datalabels';
// import Header from '../components/header';
// import Footer from '../components/footer';
// import { Link } from 'react-router-dom';
// import '../styles/adminDashboard.css';

// // Register the datalabels plugin globally
// Chart.register(ChartDataLabels);

// function AdminDashboard() {
//   const [user, setUser] = useState({
//     isAuthenticated: false,
//     isAdmin: false,
//     isOwner: false,
//   });

//   // 1) On mount, verify user session
//   useEffect(() => {
//     async function fetchUser() {
//       try {
//         const token = localStorage.getItem('authToken');
//         if (!token) throw new Error('No token found');
//         const response = await axios.get('/api/current_user', {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         const userData = response.data;
//         setUser({
//           isAuthenticated: true,
//           isAdmin: userData.role === 'admin',
//           isOwner: userData.role === 'owner',
//         });
//       } catch (error) {
//         console.error('Error fetching user data:', error);
//         if (error.response && error.response.status === 401) {
//           alert('Session expired. Please log in again.');
//           localStorage.removeItem('authToken');
//         }
//         setUser({ isAuthenticated: false, isAdmin: false, isOwner: false });
//       }
//     }
//     fetchUser();
//   }, []);

//   // Commodity selection + single forecast data
//   const [variety, setVariety] = useState('Shishito');
//   const [forecastData, setForecastData] = useState(null);

//   // Main yield form
//   const [formData, setFormData] = useState({
//     startDate: '',
//     forecastDate: '',
//     yieldPerAcre: '',
//     costPerAcre: '',
//     harvestCostPerBox: '',
//     costOfBox: '',
//     boxesBonusPerYield: '',
//   });

//   // Single “Custom Price” logic for the top forecast card
//   const [customPrice, setCustomPrice] = useState('');
//   const [customRevenue, setCustomRevenue] = useState('');
//   const [customRevenueAfterCosts, setCustomRevenueAfterCosts] = useState('');

//   // The table data for the “Revenue Calculator”
//   const [revenueTableData, setRevenueTableData] = useState(() => {
//     try {
//       const saved = localStorage.getItem('myRevenueTable');
//       return saved ? JSON.parse(saved) : [];
//     } catch {
//       return [];
//     }
//   });
  
//   // Totals for summary
//   const [totalRevenue, setTotalRevenue] = useState('0');
//   const [totalCostings, setTotalCostings] = useState('0');
//   const [totalNetMargin, setTotalNetMargin] = useState('0');

//   // Chart instance
//   const [chart, setChart] = useState(null);

//   // --- 1) Load from localStorage on mount
//   useEffect(() => {
//     // In load useEffect
//     const savedTable = localStorage.getItem('myRevenueTable');
//     if (savedTable) {
//       try {
//         setRevenueTableData(JSON.parse(savedTable)); 
//       } catch (e) {
//         console.error("Invalid saved table data", e);
//       }
//     }

    
//     const savedForm = localStorage.getItem('myYieldForm');
//     if (savedForm) {
//       const parsed = JSON.parse(savedForm);
//       setVariety(parsed.variety || 'Shishito');
//       setFormData((prev) => ({ ...prev, ...parsed }));
//     }

//     const savedSummary = localStorage.getItem('mySummary');
//   if (savedSummary) {
//     try {
//       const parsedSummary = JSON.parse(savedSummary);
//       setTotalRevenue(parsedSummary.totalRevenue || '0');
//       setTotalCostings(parsedSummary.totalCostings || '0');
//       setTotalNetMargin(parsedSummary.totalNetMargin || '0');
//     } catch (e) {
//       console.error("Invalid summary data in localStorage", e);
//     }
//   }


//   }, []);

//   // --- 2) Whenever table changes, save to localStorage
//   useEffect(() => {
//     localStorage.setItem('myRevenueTable', JSON.stringify(revenueTableData));
//   }, [revenueTableData]);

//   // Also save form changes
//   useEffect(() => {
//     const toSave = { ...formData, variety };
//     localStorage.setItem('myYieldForm', JSON.stringify(toSave));
//   }, [formData, variety]);

//   // Single yield form input changes
//   function handleInputChange(e) {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   }
//   function handleVarietyChange(e) {
//     setVariety(e.target.value);
//   }

//   // Single custom price logic
//   function handleCustomPriceChange(e) {
//     const val = parseFloat(e.target.value) || 0;
//     setCustomPrice(e.target.value);

//     const ypa = parseFloat(formData.yieldPerAcre) || 0;
//     const cpa = parseFloat(formData.costPerAcre) || 0;
//     const hc  = parseFloat(formData.harvestCostPerBox) || 0;
//     const cob = parseFloat(formData.costOfBox) || 0;
//     const bb  = parseFloat(formData.boxesBonusPerYield) || 0;

//     const rev = val * ypa;
//     const totalC = cpa + (hc * ypa) + (cob * ypa) + bb;
//     const revAfter = rev - totalC;

//     setCustomRevenue(rev.toFixed(2));
//     setCustomRevenueAfterCosts(revAfter.toFixed(2));
//   }

//   // Chart
//   async function updateChart() {
//     if (!variety) return;
//     try {
//       const token = localStorage.getItem('authToken');
//       if (!token) throw new Error('No token found');
//       const response = await axios.get('/api/seasonal_prices', {
//         headers: { Authorization: `Bearer ${token}` },
//         params: { variety },
//       });
//       const data = response.data;
//       const canvas = document.getElementById('seasonPriceChart');
//       if (!canvas) return;

//       const ctx = canvas.getContext('2d');
//       if (chart) chart.destroy();

//       const newChart = new Chart(ctx, {
//         type: 'bar',
//         data: {
//           labels: ['Spring', 'Summer', 'Autumn', 'Winter'],
//           datasets: [
//             {
//               label: `Forecasted Price for ${variety}`,
//               data: [data.Spring, data.Summer, data.Autumn, data.Winter],
//               backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
//               borderColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
//               borderWidth: 0.3,
//             },
//           ],
//         },
//         plugins: [ChartDataLabels],
//         options: {
//           responsive: true,
//           plugins: {
//             legend: { display: false },
//             datalabels: {
//               color: 'black',
//               anchor: 'end',
//               align: 'top',
//               formatter: (value) => `$${value}`,
//             },
//           },
//           scales: {
//             x: { ticks: { color: 'black' } },
//             y: {
//               ticks: { color: 'black' },
//               title: { display: true, text: 'Price ($)', color: 'black' },
//             },
//           },
//         },
//       });
//       setChart(newChart);
//     } catch (error) {
//       console.error('Error fetching chart data:', error);
//     }
//   }

//   useEffect(() => {
//     updateChart();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [variety]);

//   // Helper to recalc a single row’s derived fields
//   function computeRowTotals(row) {
//     const ypa = parseFloat(row.yieldPerAcre) || 0;
//     const cpa = parseFloat(row.costPerAcre) || 0;
//     const hc  = parseFloat(row.harvestCostPerBox) || 0;
//     const cob = parseFloat(row.costOfBox) || 0;
//     const bb  = parseFloat(row.boxesBonusPerYield) || 0;
//     const acreCount = parseFloat(row.acreCount) || 0;

//     // Forecast columns
//     const forecastPrice = parseFloat(row.forecastedPrice) || 0;
//     const revAcre = forecastPrice * ypa;
//     const totalC = cpa + (hc * ypa) + (cob * ypa) + bb;
//     const revAfter = revAcre - totalC;

//     row.revenuePerAcre = revAcre.toFixed(2);
//     row.revenuePerAcreAfterCostings = revAfter.toFixed(2);

//     // If custom price is set
//     let cPrice = parseFloat(row.customForecastedPrice) || 0;
//     let cRevAcre = cPrice * ypa;
//     let cRevAfter = cRevAcre - totalC;

//     row.customRevenuePerAcre = cRevAcre.toFixed(2);
//     row.customRevenuePerAcreAfterCostings = cRevAfter.toFixed(2);

//     // Multiply by “No. of Acres”
//     let totRev = revAcre * acreCount;
//     let totRevAfter = revAfter * acreCount;
//     let totCustomRev = cRevAcre * acreCount;
//     let totCustomRevAfter = cRevAfter * acreCount;

//     row.totalRevenue = totRev.toFixed(2);
//     row.totalRevenueAfter = totRevAfter.toFixed(2);
//     row.totalCustomRevenue = totCustomRev.toFixed(2);
//     row.totalCustomRevenueAfter = totCustomRevAfter.toFixed(2);

//     return row;
//   }

//   // Recalc entire table’s derived fields + summary
//   function recalcTable(table) {
//     let newTable = table.map((row) => computeRowTotals({ ...row }));

//     let sumRevenue = 0;
//     let sumNet = 0;
//     newTable.forEach((row) => {
//       // If user entered custom price, we could choose to sum custom columns
//       // or always sum forecast columns. Here we sum forecast columns:
//       sumRevenue += parseFloat(row.totalRevenue) || 0;
//       sumNet += parseFloat(row.totalRevenueAfter) || 0;
//     });

//     let cost = sumRevenue - sumNet;

//     const revenueStr = sumRevenue.toFixed(2);
//     const costStr = cost.toFixed(2);
//     const netStr = sumNet.toFixed(2);

//     setTotalRevenue(sumRevenue.toFixed(2));
//     setTotalCostings(cost.toFixed(2));
//     setTotalNetMargin(sumNet.toFixed(2));

//     setRevenueTableData(newTable);


//     localStorage.setItem('mySummary', JSON.stringify({
//       totalRevenue: revenueStr,
//       totalCostings: costStr,
//       totalNetMargin: netStr
//     }));
  
//   }

//   // “Add Variety” button
//   function addVarietyRow() {
//     const newRow = {
//       id: Date.now(),
//       variety: '',
//       acreCount: '1',
//       yieldPerAcre: '',
//       costPerAcre: '',
//       harvestCostPerBox: '',
//       costOfBox: '',
//       boxesBonusPerYield: '',
//       forecastedPrice: '0',
//       revenuePerAcre: '0',
//       revenuePerAcreAfterCostings: '0',
//       customForecastedPrice: '',
//       customRevenuePerAcre: '0',
//       customRevenuePerAcreAfterCostings: '0',
//       totalRevenue: '0',
//       totalRevenueAfter: '0',
//       totalCustomRevenue: '0',
//       totalCustomRevenueAfter: '0',
//     };
//     setRevenueTableData((prev) => [...prev, newRow]);
//   }

//   // “Remove Variety” button
//   function removeVarietyRow(id) {
//     const updated = revenueTableData.filter((r) => r.id !== id);
//     recalcTable(updated);
//   }

//   // Handle changes in table row fields
//   function handleTableInputChange(id, field, value) {
//     const updated = revenueTableData.map((row) => {
//       if (row.id === id) {
//         return { ...row, [field]: value };
//       }
//       return row;
//     });
//     recalcTable(updated);
//   }

//   // “Calculate All Rows” button
//   async function handleCalculateAllRows() {
//     try {
//       const token = localStorage.getItem('authToken');
//       if (!token) throw new Error('No token found');

//       const updated = [];
//       for (let row of revenueTableData) {
//         if (!row.variety) {
//           updated.push(row);
//           continue;
//         }
//         const payload = {
//           variety: row.variety,
//           start_date: formData.startDate,
//           forecast_date: formData.forecastDate,
//           yield_per_acre: row.yieldPerAcre || 0,
//           cost_per_acre: row.costPerAcre || 0,
//           harvest_cost_per_box: row.harvestCostPerBox || 0,
//           cost_of_box: row.costOfBox || 0,
//           boxes_bonus_per_yield: row.boxesBonusPerYield || 0,
//         };
//         const resp = await axios.post('/api/calculate_forecast', payload, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         let newRow = { ...row };
//         newRow.forecastedPrice = resp.data.forecasted_price.toFixed(2);
//         newRow.revenuePerAcre = resp.data.revenue_per_acre.toFixed(2);
//         newRow.revenuePerAcreAfterCostings = resp.data.revenue_per_acre_after_costings.toFixed(2);
//         // Recompute totals (including custom)
//         newRow = computeRowTotals(newRow);
//         updated.push(newRow);
//       }
//       recalcTable(updated);
//     } catch (err) {
//       console.error('Error calculating rows:', err);
//       alert('Failed to recalc table rows.');
//     }
//   }

//   // Single yield form submission => fetch forecast for top card
//   async function handleSubmit(e) {
//     e.preventDefault();
//     // 1) Save new date filters in formData (already done by handleInputChange).
//     // 2) Check if variety is already in the table
//     const existingRow = revenueTableData.find(
//       (r) => r.variety === variety
//     );
  
//     // 3) If variety not found, add a new row
//     if (!existingRow) {
//       const newRow = {
//         id: Date.now(),
//         variety,
//         acreCount: '1',
//         yieldPerAcre: formData.yieldPerAcre,
//         costPerAcre: formData.costPerAcre,
//         harvestCostPerBox: formData.harvestCostPerBox,
//         costOfBox: formData.costOfBox,
//         boxesBonusPerYield: formData.boxesBonusPerYield,
//         forecastedPrice: '0',
//         revenuePerAcre: '0',
//         revenuePerAcreAfterCostings: '0',
//         customForecastedPrice: '',
//         customRevenuePerAcre: '0',
//         customRevenuePerAcreAfterCostings: '0',
//         totalRevenue: '0',
//         totalRevenueAfter: '0',
//         totalCustomRevenue: '0',
//         totalCustomRevenueAfter: '0',
//       };
//       setRevenueTableData((prev) => [...prev, newRow]);
//     } else {
//       // (Optionally) Update the existing row’s yield/cost fields 
//       // if you want the table to reflect the newly entered cost data:
//       existingRow.yieldPerAcre = formData.yieldPerAcre;
//       existingRow.costPerAcre = formData.costPerAcre;
//       existingRow.harvestCostPerBox = formData.harvestCostPerBox;
//       existingRow.costOfBox = formData.costOfBox;
//       existingRow.boxesBonusPerYield = formData.boxesBonusPerYield;
  
//       // Then set state so React re-renders
//       setRevenueTableData((prev) =>
//         prev.map((r) => (r.id === existingRow.id ? existingRow : r))
//       );
//     }
  
//     // 4) Now re-calc all rows with the new date filters
//     //    This fetches new forecast data for *every* variety in the table
//     await handleCalculateAllRows();
  
//     // 5) Optionally set the single forecast card from the row 
//     //    that matches the user’s chosen variety:
//     const updatedRow = revenueTableData.find(
//       (r) => r.variety === variety
//     );
//     if (updatedRow) {
//       // Build an object that looks like your forecastData
//       setForecastData({
//         forecasted_price: updatedRow.forecastedPrice,
//         revenue_per_acre: updatedRow.revenuePerAcre,
//         revenue_per_acre_after_costings: updatedRow.revenuePerAcreAfterCostings,
//         season: '(unknown)' // Or you can store "season" in each row if you want
//       });
  
//       // Clear the single custom price fields 
//       setCustomPrice('');
//       setCustomRevenue('');
//       setCustomRevenueAfterCosts('');
//     }
//   }
  

//   return (
//     <div>
//       <Header isAuthenticated={user.isAuthenticated} isAdmin={user.isAdmin} isOwner={user.isOwner} />
//       <div className="container adminDash-section">
//         <div className="mt-3 mb-3">
//           <Link to="/approve_users" className="btn btn-primary">
//             Approve Users
//           </Link>
//         </div>
//         <h1 className="mt-4">Admin Dashboard</h1>
//         <p>Welcome, Admin! You have Admin privileges.</p>

//         <ul className="nav nav-tabs">
//           <li className="nav-item">
//             <a className="nav-link active" data-toggle="tab">Yield Calculator</a>
//           </li>
//         </ul>

//         <div className="tab-content">
//           <div className="tab-pane fade show active" id="yield-calculator">
//             {/* Yield Calculator Form + Single Forecast Card */}
//             <div className="row mt-4">
//               <div className="col-md-6">
//                 <form onSubmit={handleSubmit}>
//                   <div className="form-group mb-3">
//                     <label>Select Variety:</label>
//                     <select className="form-control"
//                       value={variety}
//                       onChange={handleVarietyChange}
//                     >
//                       <option value="Shishito">Shishito</option>
//                       <option value="Anaheim">Anaheim</option>
//                       <option value="Cubanelle">Cubanelles</option>
//                       <option value="Fresno">Fresno</option>
//                       <option value="Habanero">Habanero</option>
//                       <option value="Hungarian Wax">Hungarian Wax</option>
//                       <option value="Jalapeno">Jalapeno</option>
//                       <option value="Long Hot">Long Hot</option>
//                       <option value="Poblano">Poblano</option>
//                       <option value="Serrano">Serrano</option>
//                     </select>
//                   </div>
//                   <div className="form-group mb-3">
//                     <label>Enter Start Date:</label>
//                     <input
//                       type="date"
//                       name="startDate"
//                       className="form-control"
//                       value={formData.startDate}
//                       onChange={handleInputChange}
//                       required
//                     />
//                   </div>
//                   <div className="form-group mb-3">
//                     <label>Enter Forecast Date:</label>
//                     <input
//                       type="date"
//                       name="forecastDate"
//                       className="form-control"
//                       value={formData.forecastDate}
//                       onChange={handleInputChange}
//                       required
//                     />
//                   </div>
//                   <div className="form-group mb-3">
//                     <label>Yield per Acre (Boxes/Acre):</label>
//                     <input
//                       type="number"
//                       name="yieldPerAcre"
//                       className="form-control"
//                       value={formData.yieldPerAcre}
//                       onChange={handleInputChange}
//                       required
//                     />
//                   </div>
//                   <div className="form-group mb-3">
//                     <label>Cost per Acre ($):</label>
//                     <input
//                       type="number"
//                       name="costPerAcre"
//                       className="form-control"
//                       value={formData.costPerAcre}
//                       onChange={handleInputChange}
//                     />
//                   </div>
//                   <div className="form-group mb-3">
//                     <label>Harvest cost per box ($):</label>
//                     <input
//                       type="number"
//                       name="harvestCostPerBox"
//                       className="form-control"
//                       value={formData.harvestCostPerBox}
//                       onChange={handleInputChange}
//                     />
//                   </div>
//                   <div className="form-group mb-3">
//                     <label>Cost of box ($):</label>
//                     <input
//                       type="number"
//                       name="costOfBox"
//                       className="form-control"
//                       value={formData.costOfBox}
//                       onChange={handleInputChange}
//                     />
//                   </div>
//                   <div className="form-group mb-3">
//                     <label>Boxes bonus per yield per Acre ($):</label>
//                     <input
//                       type="number"
//                       name="boxesBonusPerYield"
//                       className="form-control"
//                       value={formData.boxesBonusPerYield}
//                       onChange={handleInputChange}
//                     />
//                   </div>
//                   <button type="submit" className="btn btn-primary">
//                     Calculate
//                   </button>
//                 </form>
//               </div>

//               {/* Right column: Forecast results + Custom Price */}
//               <div className="col-md-6">
//                 {forecastData ? (
//                   <>
//                     <div className="card Forecast-Results">
//                       <div className="card-body">
//                         <h2>Forecast Results</h2>
//                         <table className="table table-bordered table-sm">
//                           <tbody>
//                             <tr>
//                               <th>Forecasted Price per Box</th>
//                               <td>${forecastData.forecasted_price}</td>
//                             </tr>
//                             <tr>
//                               <th>Revenue per Acre</th>
//                               <td>${forecastData.revenue_per_acre}</td>
//                             </tr>
//                             <tr>
//                               <th>Revenue per Acre after costings</th>
//                               <td>${forecastData.revenue_per_acre_after_costings}</td>
//                             </tr>
//                             <tr>
//                               <th>Season for Forecast Date</th>
//                               <td>{forecastData.season}</td>
//                             </tr>
//                           </tbody>
//                         </table>
//                       </div>
//                     </div>

//                     <hr />

//                     {/* Custom Price card */}
//                     <div className="card Forecast-Results mt-3">
//                       <div className="card-body">
//                         <h2>Try a Custom Forecasted Price</h2>
//                         <table className="table table-bordered table-sm">
//                           <tbody>
//                             <tr>
//                               <th>Forecasted Price per Box</th>
//                               <td>
//                                 <input
//                                   type="number"
//                                   className="form-control"
//                                   value={customPrice}
//                                   onChange={handleCustomPriceChange}
//                                 />
//                               </td>
//                             </tr>
//                             <tr>
//                               <th>Revenue per Acre</th>
//                               <td>
//                                 {customRevenue ? `$${customRevenue}` : ''}
//                               </td>
//                             </tr>
//                             <tr>
//                               <th>Revenue per Acre after costings</th>
//                               <td>
//                                 {customRevenueAfterCosts
//                                   ? `$${customRevenueAfterCosts}`
//                                   : ''}
//                               </td>
//                             </tr>
//                           </tbody>
//                         </table>
//                       </div>
//                     </div>
//                   </>
//                 ) : (
//                   <p>No forecast available yet. Please enter data & press Calculate.</p>
//                 )}
//               </div>
//             </div>

//             <hr />

//             {/* Revenue Calculator Table - always visible */}
//             <h2 className="mt-4 text-center">Revenue Calculator</h2>

//             <div className="summary-section mb-3">
//               <h4>Summary</h4>
//               <p>
//                 The total Forecasted Revenue of your Selected Varieties is
//                 <strong> ${totalRevenue}</strong>, the costings are
//                 <strong> ${totalCostings}</strong>,
//                 so your net margin is
//                 <strong> ${totalNetMargin}</strong>.
//               </p>
//             </div>

//             <div className="mb-2">
//               <button type="button" className="btn btn-sm btn-success" onClick={addVarietyRow}>
//                 + Add Variety
//               </button>
//             </div>

//             <div className="table-responsive">
//               <table className="table table-sm table-bordered">
//                 <thead>
//                   <tr>
//                     <th>Variety</th>
//                     <th>No. of Acres</th>
//                     <th>Yield/Acre</th>
//                     <th>Cost/Acre</th>
//                     <th>Harvest$/Box</th>
//                     <th>Cost of Box</th>
//                     <th>Boxes Bonus</th>
//                     <th></th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {revenueTableData.map((row) => (
//                     <React.Fragment key={row.id}>
//                       {/* Editable row */}
//                       <tr>
//                         <td style={{ minWidth: '100px' }}>
//                           <select
//                             className="form-control form-control-sm"
//                             value={row.variety}
//                             onChange={(e) => handleTableInputChange(row.id, 'variety', e.target.value)}
//                           >
//                             <option value="">Select Variety</option>
//                             <option value="Shishito">Shishito</option>
//                             <option value="Anaheim">Anaheim</option>
//                             <option value="Cubanelle">Cubanelles</option>
//                             <option value="Fresno">Fresno</option>
//                             <option value="Habanero">Habanero</option>
//                             <option value="Hungarian Wax">Hungarian Wax</option>
//                             <option value="Jalapeno">Jalapeno</option>
//                             <option value="Long Hot">Long Hot</option>
//                             <option value="Poblano">Poblano</option>
//                             <option value="Serrano">Serrano</option>
//                           </select>
//                         </td>
//                         <td>
//                           <input
//                             type="number"
//                             className="form-control form-control-sm"
//                             value={row.acreCount || ''}
//                             onChange={(e) => handleTableInputChange(row.id, 'acreCount', e.target.value)}
//                           />
//                         </td>
//                         <td>
//                           <input
//                             type="number"
//                             className="form-control form-control-sm"
//                             value={row.yieldPerAcre}
//                             onChange={(e) => handleTableInputChange(row.id, 'yieldPerAcre', e.target.value)}
//                           />
//                         </td>
//                         <td>
//                           <input
//                             type="number"
//                             className="form-control form-control-sm"
//                             value={row.costPerAcre}
//                             onChange={(e) => handleTableInputChange(row.id, 'costPerAcre', e.target.value)}
//                           />
//                         </td>
//                         <td>
//                           <input
//                             type="number"
//                             className="form-control form-control-sm"
//                             value={row.harvestCostPerBox}
//                             onChange={(e) => handleTableInputChange(row.id, 'harvestCostPerBox', e.target.value)}
//                           />
//                         </td>
//                         <td>
//                           <input
//                             type="number"
//                             className="form-control form-control-sm"
//                             value={row.costOfBox}
//                             onChange={(e) => handleTableInputChange(row.id, 'costOfBox', e.target.value)}
//                           />
//                         </td>
//                         <td>
//                           <input
//                             type="number"
//                             className="form-control form-control-sm"
//                             value={row.boxesBonusPerYield}
//                             onChange={(e) => handleTableInputChange(row.id, 'boxesBonusPerYield', e.target.value)}
//                           />
//                         </td>
//                         <td>
//                           <button
//                             type="button"
//                             className="btn btn-sm btn-danger"
//                             onClick={() => removeVarietyRow(row.id)}
//                           >
//                             −
//                           </button>
//                         </td>
//                       </tr>

//                       {/* Sub-row with read-only “cards” */}
//                       <tr>
//                         <td colSpan="8" style={{ background: '#f8f9fa' }}>
//                           <div className="d-flex flex-wrap" style={{ gap: '1rem' }}>
//                             {/* Forecast Price */}
//                             <div className="card p-2" style={{ minWidth: '120px', background: '#dbeafe' }}>
//                               <strong>Forecast $:</strong> ${row.forecastedPrice}
//                             </div>

//                             {/* Revenue/Acre + After */}
//                             <div className="card p-2" style={{ minWidth: '140px', background: '#ffe4e6' }}>
//                               <strong>Rev/Acre:</strong> ${row.revenuePerAcre} <br />
//                               <strong>After:</strong> ${row.revenuePerAcreAfterCostings}
//                             </div>

//                             {/* Totals for forecast * acres */}
//                             <div className="card p-2" style={{ minWidth: '160px', background: '#fef9c3' }}>
//                               <strong>Total Rev:</strong> ${row.totalRevenue} <br />
//                               <strong>Total After:</strong> ${row.totalRevenueAfter}
//                             </div>

//                             {/* Custom Price + custom rev */}
//                             <div className="card p-2" style={{ minWidth: '140px', background: '#dbeafe' }}>
//                               <strong>Custom $:</strong>
//                               <input
//                                 type="number"
//                                 className="form-control form-control-sm mt-1"
//                                 value={row.customForecastedPrice}
//                                 onChange={(e) => handleTableInputChange(row.id, 'customForecastedPrice', e.target.value)}
//                               />
//                             </div>

//                             <div className="card p-2" style={{ minWidth: '160px', background: '#ffe4e6' }}>
//                               <strong>Custom Rev/Acre:</strong> ${row.customRevenuePerAcre} <br />
//                               <strong>After:</strong> ${row.customRevenuePerAcreAfterCostings}
//                             </div>

//                             <div className="card p-2" style={{ minWidth: '160px', background: '#fef9c3' }}>
//                               <strong>Total Custom Rev:</strong> ${row.totalCustomRevenue} <br />
//                               <strong>Total Custom After:</strong> ${row.totalCustomRevenueAfter}
//                             </div>
//                           </div>
//                         </td>
//                       </tr>
//                     </React.Fragment>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             {/* Button at bottom to recalc all new varieties */}
//             <button
//               type="button"
//               className="btn btn-info mt-2"
//               onClick={handleCalculateAllRows}
//             >
//               Calculate Forecast for All Rows
//             </button>

//             <hr />
//             <div className="row">
//               <div className="col-md-12">
//                 <h2>Analytics: Forecasted Prices by Season</h2>
//                 <canvas id="seasonPriceChart"></canvas>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//       <Footer />
//     </div>
//   );
// }

// export default AdminDashboard;
