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
import '../styles/sales_styles.css';
import Header from '../components/header';
import Footer from '../components/footer';
import '../styles/sales_styles.css';
import Plot from 'react-plotly.js';

function SalesDashboard() {
  const [commodities, setCommodities] = useState([]);
  const [cities, setCities] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // const [seasonalChart, setSeasonalChart] = useState(null);
  // const [commodity, setCommodity] = useState('Anaheim');
  const [shippingPrices, setShippingPrices] = useState({});

  const [source, setSource] = useState('USDA');
  const [last7Days, setLast7Days] = useState(false);
  const [bestMarketData, setBestMarketData] = useState([]);
  // const [chartInstance, setChartInstance] = useState(null);
  const [currentSectionTitle, setCurrentSectionTitle] = useState('Best Sell Market');
  const [filters, setFilters] = useState({
    bestSellMarket: true,
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
    startDate: '2024-01-01', // Default to a valid date
    endDate: '2024-12-31', // Default to a valid date
    averageCommodities: false,
    averageCities: false,
  });

  const [appliedHistoricalFilters, setAppliedHistoricalFilters] = useState({
    commodities: ['Anaheim'],
    cities: ['New York'],
    source: 'USDA',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    averageCommodities: false,
    averageCities: false,
  });
  const [terminalViolinData, setTerminalViolinData] = useState([]);
  const [shippingViolinData, setShippingViolinData] = useState([]);

  const [terminalEmpiricalData, setTerminalEmpiricalData] = useState([]);
  const [terminalEmpiricalLoading, setTerminalEmpiricalLoading] = useState(true);
  const [terminalEmpiricalError, setTerminalEmpiricalError] = useState(null);

  const [shippingEmpiricalData, setShippingEmpiricalData] = useState([]);
  const [shippingEmpiricalLoading, setShippingEmpiricalLoading] = useState(true);
  const [shippingEmpiricalError, setShippingEmpiricalError] = useState(null);

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
    commodities: ['Anaheim'], // Default to one or more items
    regions: ['Central and South Florida'], // Default to one or more regions
    source: 'ProduceIQ', // Default source for shipping point price
    startDate: '2024-01-01', // Default to a valid date
    endDate: '2024-12-31', // Default to a valid date
    averageCommodities: false,
    averageRegions: false,
  });

  const [appliedShippingPointFilters, setAppliedShippingPointFilters] = useState({
    commodities: ['Anaheim'],
    regions: ['Central and South Florida'],
    source: 'ProduceIQ',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
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

  // Prepare data for Plotly
  const fetchTerminalViolinData = async () => {
    try {
      const response = await fetch('/api/terminal_price_violin');
      console.log('Terminal API Response Status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to fetch terminal violin plot data');
      }

      const data = await response.json();
      console.log('Fetched Terminal Data:', data); // Log the fetched data
      setTerminalViolinData(data);
    } catch (error) {
      console.error('Error fetching terminal violin data:', error);
    }
  };

  useEffect(() => {
    fetchTerminalViolinData();
  }, []);

  // Fetch data for the shipping violin plot
  const fetchShippingViolinData = async () => {
    try {
      const response = await fetch('/api/shipping_price_violin');
      console.log('Shipping API Response Status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to fetch shipping violin plot data');
      }

      const data = await response.json();
      console.log('Fetched Shipping Data:', data); // Log the fetched data
      setShippingViolinData(data);
    } catch (error) {
      console.error('Error fetching shipping violin data:', error);
    }
  };

  useEffect(() => {
    fetchShippingViolinData();
  }, []);

  // Prepare data for the terminal violin plot
  const TerminalplotData = Object.values(
    terminalViolinData.reduce((acc, item) => {
      const { varietyName, price } = item;

      // Ensure unique grouping by varietyName
      if (!acc[varietyName]) {
        acc[varietyName] = {
          type: 'violin',
          y: [], // Initialize prices array
          name: varietyName, // x-axis label
          box: { visible: true },
          meanline: { visible: true },
          marker: { color: '#636efa' },
        };
      }

      // Add price to the corresponding variety
      acc[varietyName].y.push(price);

      return acc;
    }, {})
  );

  // Prepare data for the shipping violin plot
  const ShippingplotData = shippingViolinData.reduce((acc, item) => {
    const { varietyName, price } = item;
    const existingEntry = acc.find((entry) => entry.name === varietyName);
    if (existingEntry) {
      existingEntry.y.push(price);
    } else {
      acc.push({
        type: 'violin',
        y: [price],
        name: varietyName,
        box: { visible: true },
        meanline: { visible: true },
        marker: { color: '#00cc96' }, // Color for shipping plot
      });
    }
    return acc;
  }, []);

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
      console.log('Toggled right sidebar:', rightSidebar.className);
    } else {
      console.error('Right sidebar reference is null');
    }
  };

  // Minimize/Maximize Block
  const toggleBlockSize = (blockId, blockTitle) => {
    setMinimizedBlocks((prev) => {
      if (prev.includes(blockId)) {
        console.log(`Restoring block: ${blockId}`);

        // Restore the block
        const blockElement = document.getElementById(blockId);
        blockElement.classList.remove('hidden');
        return prev.filter((id) => id !== blockId); // Remove from minimizedBlocks
      } else {
        // Minimize the block
        console.log(`Minimizing block: ${blockId}`);

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

  // Fetch Most Recent Prices Data
  const fetchMostRecentPrices = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token found');

      const response = await fetch('/api/most_recent_prices', {
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

  const updateSeasonalChart = async () => {
    const params = new URLSearchParams();
    if (commodities.length > 0) params.append('commodities', commodities.join(','));
    if (cities.length > 0) params.append('cities', cities.join(','));
    if (startDate && endDate) {
      params.append('start_date', startDate);
      params.append('end_date', endDate);
    }

    try {
      const response = await fetch(`/api/sales_seasonal_prices?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch seasonal data');

      const data = await response.json();
      const ctx = seasonalChartRef.current.getContext('2d');

      // Destroy existing chart instance
      if (seasonalChartRef.current.chart) {
        seasonalChartRef.current.chart.destroy();
      }

      // Create new chart
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

      seasonalChartRef.current.chart = newChart; // Save chart instance
    } catch (error) {
      console.error('Error fetching seasonal data:', error);
    }
  };

  const handleApplySeasonalFilters = () => {
    if ((startDate && !endDate) || (!startDate && endDate)) {
      // alert("Please provide both start date and end date.");
      return;
    }

    updateSeasonalChart();
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
    } catch (error) {
      console.log(' historical data');
    }
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

    if (!chartData.labels.length || !chartData.datasets.length) {
      // alert('No data available for the Shipping Point Price chart.');
      return;
    }

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
        },
        interaction: { mode: 'index', intersect: false },
      },
    });

    setShippingPointPriceChart(newChart);
  };

  const fetchShippingPointPriceData = async (filters = {}) => {
    const { commodities = [], regions = [], source = '', startDate = '', endDate = '', averageCommodities = false, averageRegions = false } = filters;
    try {
      console.log('Filters:', filters); // Log filters

      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token found');

      // Construct query parameters
      const params = new URLSearchParams({
        commodities: commodities.join(','),
        regions: regions.join(','),
        source,
        start_date: startDate,
        end_date: endDate,
        averageCommodities: averageCommodities.toString(),
        averageRegions: averageRegions.toString(),
      });

      // Fetch data from backend
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
      updateShippingPointPriceChart(data); // Update chart with the fetched data
    } catch (error) {
      console.error('Error fetching Shipping Point Price data:', error);
    }
  };

  useEffect(() => {
    fetchShippingPointPriceData({
      commodities: ['Jalapeno'], // Default commodity for testing
      regions: ['mexico crossings through texas'], // Default region for testing
      source: 'ProduceIQ',
      startDate: '2020-01-01',
      endDate: '2020-12-31',
    });
  }, []);

  // for terminal empricial probability charts

  useEffect(() => {
    // Fetch data from the backend API
    const fetchData = async () => {
      try {
        const response = await fetch('/api/terminal_empricial_probability');
        if (!response.ok) throw new Error('Failed to fetch data');

        const result = await response.json();
        setTerminalEmpiricalData(result);
        setTerminalEmpiricalLoading(false);
      } catch (err) {
        setTerminalEmpiricalError(err.message);
        setTerminalEmpiricalLoading(false);
      }
    };

    fetchData();
  }, []);

  if (terminalEmpiricalLoading) {
    console.log('terminal Empirical Loading');
  }

  if (terminalEmpiricalError) {
    console.log('terminal Empirical Error');
  }

  const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

  // Generate subplots for each commodity
  const traces = terminalEmpiricalData.map((item, index) => {
    const mean = item.mean;
    const std_dev = item.std_dev;

    return [
      // Histogram for prices
      {
        x: item.price,
        type: 'histogram',
        name: item.commodity,
        marker: { color: colors[index % colors.length] },
        opacity: 0.75,
        nbinsx: 50, // Number of bins
      },
      // Line for mean
      {
        x: [mean, mean],
        y: [0, 50], // Adjust the y-range dynamically if needed
        type: 'scatter',
        mode: 'lines',
        line: { color: 'red', dash: 'dash' },
        name: `${item.commodity} Mean`,
        showlegend: false,
      },
      // Markers for standard deviation
      {
        x: [mean - std_dev, mean + std_dev],
        y: [0, 0],
        type: 'scatter',
        mode: 'markers',
        marker: { color: 'blue', size: 8, symbol: 'cross' },
        name: `${item.commodity} Std Dev`,
        showlegend: false,
      },
    ];
  });

  // for shipping empricial probability charts

  useEffect(() => {
    // Fetch data from the backend API
    const fetchData = async () => {
      try {
        const response = await fetch('/api/shipping_empricial_probability');
        if (!response.ok) throw new Error('Failed to fetch data');

        const result = await response.json();
        setShippingEmpiricalData(result);
        setShippingEmpiricalLoading(false);
      } catch (err) {
        setShippingEmpiricalError(err.message);
        setShippingEmpiricalLoading(false);
      }
    };

    fetchData();
  }, []);

  if (shippingEmpiricalLoading) {
    console.log('Shipping Empirical Loading');
  }

  if (shippingEmpiricalError) {
    console.log('Shipping Empirical Error:', shippingEmpiricalError);
  }

  // Renamed `colors` to `colorPalette` to avoid conflicts
  const colorPalette = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

  // Renamed `traces` to `shippingTraces` to avoid conflicts
  const shippingTraces = shippingEmpiricalData.flatMap((item, index) => {
    const mean = item.mean;
    const std_dev = item.std_dev;

    return [
      // Histogram for prices
      {
        x: item.price,
        type: 'histogram',
        name: item.commodity,
        marker: { color: colorPalette[index % colorPalette.length] },
        opacity: 0.75,
        nbinsx: 50, // Number of bins
      },
      // Line for mean
      {
        x: [mean, mean],
        y: [0, 50], // Adjust the y-range dynamically if needed
        type: 'scatter',
        mode: 'lines',
        line: { color: 'red', dash: 'dash' },
        name: `${item.commodity} Mean`,
        showlegend: false,
      },
      // Markers for standard deviation
      {
        x: [mean - std_dev, mean + std_dev],
        y: [0, 0],
        type: 'scatter',
        mode: 'markers',
        marker: { color: 'blue', size: 8, symbol: 'cross' },
        name: `${item.commodity} Std Dev`,
        showlegend: false,
      },
    ];
  });

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
            {filters.bestSellMarket}
            {filters.seasonalTrends}
            {filters.historicalData}
            {filters.shippingPointPrice}

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
                  value={commodities}
                  onChange={(e) => setCommodities(Array.from(e.target.selectedOptions, (opt) => opt.value))}
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
                <select
                  id="cityFilterSeasonal"
                  className="form-control"
                  value={cities}
                  onChange={(e) => setCities(Array.from(e.target.selectedOptions, (opt) => opt.value))}
                  multiple
                >
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
                  placeholder="YYYY-MM-DD"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
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
                  placeholder="YYYY-MM-DD"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
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
                  {['Central and South Florida', 'Texas', 'California', 'Arizona', 'New Mexico', 'Georgia', 'North Carolina', 'Virginia'].map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
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
                      </tbody>{' '}
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
              <div id="most-recent-price-section" className="section">
                <div className="row mb-4 salesBody">
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
              {/* terminal voilin plot */}
              <div id="terminal-voilin-plot-section" className="section">
                <div>
                  <h2>Terminal Violin Plot</h2>

                  {terminalViolinData.length > 0 ? (
                    <>
                      {console.log('Final TerminalplotData:', TerminalplotData)}
                      <Plot
                        data={TerminalplotData}
                        layout={{
                          title: 'Terminal Measures of Central Tendency and Dispersion',
                          xaxis: { title: 'Variety' },
                          yaxis: { title: 'Avg Daily Price' },
                          height: 700,
                          width: 1100, // Set your desired width here
                          showlegend: false, // Disable the legend
                          margin: { l: 50, r: 50, t: 50, b: 50 }, // Equal left and right margins

                          autosize: true,
                        }}
                      />
                    </>
                  ) : (
                    <p>Loading...</p>
                  )}
                </div>
              </div>
              {/* // Empirical Probability for Terminal prices * */}
              <div id="terminal-empricial-probability-section" className="section">
                <div style={{ marginTop: '100px' }}>
                  <h1>Terminal Empirical Probability Distribution</h1>
                  {/* // Show loading text if data is still being fetched * */}
                  {terminalEmpiricalLoading ? (
                    <p>Loading charts, please wait...</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around' }}>
                      {terminalEmpiricalData.map((item, index) => {
                        const mean = item.mean;
                        const std_dev = item.std_dev;

                        return (
                          <div key={index} style={{ margin: '20px', width: '400px' }}>
                            <h3>{item.commodity}</h3>
                            <Plot
                              data={[
                                // Histogram for prices
                                {
                                  x: item.price,
                                  type: 'histogram',
                                  name: item.commodity,
                                  marker: { color: colors[index % colors.length] },
                                  opacity: 0.75,
                                  nbinsx: 50, // Number of bins
                                },
                                // Line for mean
                                {
                                  x: [mean, mean],
                                  y: [0, 50], // Adjust the y-range dynamically if needed
                                  type: 'scatter',
                                  mode: 'lines',
                                  line: { color: 'red', dash: 'dash' },
                                  name: 'Mean',
                                  showlegend: false,
                                },
                                // Markers for standard deviation
                                {
                                  x: [mean - std_dev, mean + std_dev],
                                  y: [0, 0],
                                  type: 'scatter',
                                  mode: 'markers',
                                  marker: { color: 'blue', size: 8, symbol: 'cross' },
                                  name: 'Std Dev',
                                  showlegend: false,
                                },
                              ]}
                              layout={{
                                title: `Distribution of ${item.commodity}`,
                                xaxis: { title: 'Price' },
                                yaxis: { title: 'Frequency' },
                                height: 400,
                                width: 400,
                                showlegend: false,
                              }}
                              config={{ responsive: true }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {/* shipping voilin plot */}
              <div id="shipping-voilin-plot-section" className="section" style={{ marginTop: '100px' }}>
                <div>
                  <h2>Shipping Violin Plot</h2>
                  {shippingViolinData.length > 0 ? (
                    <Plot
                      data={ShippingplotData}
                      layout={{
                        title: 'Shipping Price Distribution by Commodity',
                        xaxis: { title: 'Variety' },
                        yaxis: { title: 'Shipping Price' },
                        height: 600,
                        width: 1100, // Set your desired width here
                        autosize: false,
                        showlegend: false, // Remove the legend
                        margin: { l: 50, r: 50, t: 50, b: 50 }, // Equal left and right margins
                      }}
                    />
                  ) : (
                    <p>Loading...</p>
                  )}
                </div>
              </div>
              {/*  Empirical Probability for shipping prices */}
              <div id="shipping-empricial-probability-section" className="section">
                <div style={{ marginTop: '100px' }}>
                  <h1>Shipping Empirical Probability Distribution</h1>
                  {/* // Show loading text if data is still being fetched */}
                  {shippingEmpiricalLoading ? (
                    <p>Loading charts, please wait...</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around' }}>
                      {shippingEmpiricalData.map((item, index) => {
                        const mean = item.mean;
                        const std_dev = item.std_dev;

                        return (
                          <div key={index} style={{ margin: '20px', width: '400px' }}>
                            <h3>{item.commodity}</h3>
                            <Plot
                              data={[
                                // Histogram for prices
                                {
                                  x: item.price,
                                  type: 'histogram',
                                  name: item.commodity,
                                  marker: { color: colorPalette[index % colorPalette.length] },
                                  opacity: 0.75,
                                  nbinsx: 50, // Number of bins
                                },
                                // Line for mean
                                {
                                  x: [mean, mean],
                                  y: [0, 50], // Adjust the y-range dynamically if needed
                                  type: 'scatter',
                                  mode: 'lines',
                                  line: { color: 'red', dash: 'dash' },
                                  name: 'Mean',
                                  showlegend: false,
                                },
                                // Markers for standard deviation
                                {
                                  x: [mean - std_dev, mean + std_dev],
                                  y: [0, 0],
                                  type: 'scatter',
                                  mode: 'markers',
                                  marker: { color: 'blue', size: 8, symbol: 'cross' },
                                  name: 'Std Dev',
                                  showlegend: false,
                                },
                              ]}
                              layout={{
                                title: `Distribution of ${item.commodity}`,
                                xaxis: { title: 'Price' },
                                yaxis: { title: 'Frequency' },
                                height: 400,
                                width: 400,
                                showlegend: false,
                              }}
                              config={{ responsive: true }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {/* Right Sidebar for Minimized Blocks */}
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
