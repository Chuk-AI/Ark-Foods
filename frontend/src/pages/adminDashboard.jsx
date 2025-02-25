// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import Chart from 'chart.js/auto';
// import ChartDataLabels from 'chartjs-plugin-datalabels';
// import Header from '../components/header';
// import Footer from '../components/footer';
// import { Link } from 'react-router-dom';
// import '../styles/adminDashboard.css';

// Chart.register(ChartDataLabels);

// function AdminDashboard() {

// const [customPrice, setCustomPrice] = useState('');
// const [customRevenue, setCustomRevenue] = useState('');


//   const [user, setUser] = useState({
//     isAuthenticated: false,
//     isAdmin: false,
//     isOwner: false,
//   });

//   useEffect(() => {
//     const fetchUser = async () => {
//       try {
//         const token = localStorage.getItem('authToken');
//         if (!token) {
//           throw new Error('No token found');
//         }

//         const response = await axios.get('/api/current_user', {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
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
//           setUser({ isAuthenticated: false, isAdmin: false, isOwner: false });
//           return;
//         }

//         setUser({ isAuthenticated: false, isAdmin: false, isOwner: false });
//       }
//     };

//     fetchUser();
//   }, []);

//   const [variety, setVariety] = useState('Shishito');
//   const [forecastData, setForecastData] = useState(null);
//   const [chart, setChart] = useState(null);
//   const [formData, setFormData] = useState({
//     startDate: '',
//     forecastDate: '',
//     yieldPerAcre: '',
//     // NEW FIELDS
//     costPerAcre: '',
//     harvestCostPerBox: '',
//     costOfBox: '',
//     boxesBonusPerYield: '',
//   });

//   const handleInputChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const updateChart = async () => {
//     if (!variety) {
//       alert('Please select a variety!');
//       return;
//     }

//     try {
//       const token = localStorage.getItem('authToken');
//       if (!token) {
//         throw new Error('No token found');
//       }

//       const response = await axios.get(`/api/seasonal_prices`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//         params: { variety },
//       });

//       const data = response.data;

//       const canvas = document.getElementById('seasonPriceChart');
//       if (!canvas) {
//         console.error('Canvas element not found');
//         return;
//       }

//       const ctx = canvas.getContext('2d');

//       if (chart) {
//         chart.destroy();
//       }

//       const newChart = new Chart(ctx, {
//         type: 'bar',
//         data: {
//           labels: ['Spring', 'Summer', 'Autumn', 'Winter'],
//           datasets: [
//             {
//               label: `Forecasted Price per Box for ${variety}`,
//               data: [data.Spring, data.Summer, data.Autumn, data.Winter],
//               backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
//               borderColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
//               borderWidth: 0.3,
//               barPercentage: 0.4,
//               categoryPercentage: 1,
//             },
//           ],
//         },
//         plugins: [ChartDataLabels],
//         options: {
//           responsive: true,
//           plugins: {
//             legend: {
//               display: false,
//             },
//             datalabels: {
//               color: 'black',
//               anchor: 'end',
//               align: 'top',
//               formatter: (value) => `$${value}`,
//             },
//           },
//           scales: {
//             x: {
//               ticks: { color: 'black' },
//               grid: { color: 'rgba(255, 255, 255, 0.2)' },
//             },
//             y: {
//               ticks: { color: 'black' },
//               title: {
//                 display: true,
//                 text: 'Price ($)',
//                 color: 'black',
//               },
//               grid: { color: 'rgba(255, 255, 255, 0.2)' },
//             },
//           },
//         },
//       });

//       setChart(newChart);
//     } catch (error) {
//       console.error('Error fetching seasonal prices:', error);

//       if (error.response && error.response.status === 401) {
//         alert('Session expired. Please log in again.');
//         localStorage.removeItem('authToken');
//         window.location.href = '/login';
//         return;
//       }
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     try {
//       const token = localStorage.getItem('authToken');
//       if (!token) throw new Error('No token found');

//       // Send all form fields to the backend
//       const response = await axios.post(
//         '/api/calculate_forecast',
//         {
//           variety,
//           start_date: formData.startDate,
//           forecast_date: formData.forecastDate,
//           yield_per_acre: formData.yieldPerAcre,

//           // NEW FIELDS
//           cost_per_acre: formData.costPerAcre,
//           harvest_cost_per_box: formData.harvestCostPerBox,
//           cost_of_box: formData.costOfBox,
//           boxes_bonus_per_yield: formData.boxesBonusPerYield,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       setForecastData(response.data);
//     } catch (error) {
//       console.error('Error calculating forecast:', error.response?.data || error.message);
//       alert(`Error: ${error.response?.data?.error || 'Unable to calculate forecast.'}`);
//     }
//   };

//   function computeCustomRevenue(editedPrice) {
//     if (!forecastData) return '';
  
//     // 1) Convert everything to numbers
//     const customPriceNum = parseFloat(editedPrice);
//     if (isNaN(customPriceNum)) return '';
  
//     const yieldNum = parseFloat(formData.yieldPerAcre) || 0;
//     const costAcre = parseFloat(formData.costPerAcre) || 0;
//     const harvestCost = parseFloat(formData.harvestCostPerBox) || 0;
//     const boxCost = parseFloat(formData.costOfBox) || 0;
//     const bonus = parseFloat(formData.boxesBonusPerYield) || 0;
  
//     // 2) Revenue using custom price
//     const newRevenuePerAcre = customPriceNum * yieldNum;
  
//     // 3) Same total costs formula from your backend
//     const totalCosts = costAcre
//       + (harvestCost * yieldNum)
//       + (boxCost * yieldNum)
//       + (bonus * yieldNum);
  
//     // 4) Subtract costs
//     const revenueAfterCosts = newRevenuePerAcre - totalCosts;
  
//     // Return a numeric result
//     return revenueAfterCosts;
//   }


//   function handleCustomPriceChange(e) {
//     const editedPrice = e.target.value;
//     setCustomPrice(editedPrice);
  
//     const newRevenue = computeCustomRevenue(editedPrice);
//     setCustomRevenue(newRevenue);
//   }
  

  

//   useEffect(() => {
//     updateChart();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [variety]);


//   useEffect(() => {
//     if (forecastData && forecastData.forecasted_price) {
//       // Initialize customPrice to the forecasted price from the backend
//       setCustomPrice(forecastData.forecasted_price.toString());
//     }
//   }, [forecastData]);
  

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
//             <a className="nav-link active" data-toggle="tab">
//               Yield Calculator
//             </a>
//           </li>
//         </ul>

//         <div className="tab-content">
//           <div className="tab-pane fade show active" id="yield-calculator">
//             <div className="row mt-4">
//               {/* Filters Section */}
//               <div className="col-md-6">
//                 <form onSubmit={handleSubmit}>
//                   <div className="form-group mb-3">
//                     <label htmlFor="variety">Select Variety:</label>
//                     <select
//                       id="variety"
//                       className="form-control"
//                       value={variety}
//                       onChange={(e) => setVariety(e.target.value)}
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
//                     <label htmlFor="start_date">Enter Start Date:</label>
//                     <input
//                       type="date"
//                       id="start_date"
//                       name="startDate"
//                       className="form-control"
//                       value={formData.startDate}
//                       onChange={handleInputChange}
//                       required
//                     />
//                   </div>

//                   <div className="form-group mb-3">
//                     <label htmlFor="forecast_date">Enter Forecast Date:</label>
//                     <input
//                       type="date"
//                       id="forecast_date"
//                       name="forecastDate"
//                       className="form-control"
//                       value={formData.forecastDate}
//                       onChange={handleInputChange}
//                       required
//                     />
//                   </div>

//                   <div className="form-group mb-3">
//                     <label htmlFor="yield_per_acre">Enter Yield per Acre (Boxes per Acre):</label>
//                     <input
//                       type="number"
//                       id="yield_per_acre"
//                       name="yieldPerAcre"
//                       className="form-control"
//                       value={formData.yieldPerAcre}
//                       onChange={handleInputChange}
//                       required
//                     />
//                   </div>

//                   {/* NEW FIELDS for cost calculations */}
//                   <div className="form-group mb-3">
//                     <label htmlFor="cost_per_acre">Cost per Acre ($):</label>
//                     <input
//                       type="number"
//                       id="cost_per_acre"
//                       name="costPerAcre"
//                       className="form-control"
//                       value={formData.costPerAcre}
//                       onChange={handleInputChange}
//                     />
//                   </div>

//                   <div className="form-group mb-3">
//                     <label htmlFor="harvest_cost_per_box">Harvest cost per box ($):</label>
//                     <input
//                       type="number"
//                       id="harvest_cost_per_box"
//                       name="harvestCostPerBox"
//                       className="form-control"
//                       value={formData.harvestCostPerBox}
//                       onChange={handleInputChange}
//                     />
//                   </div>

//                   <div className="form-group mb-3">
//                     <label htmlFor="cost_of_box">Cost of box ($):</label>
//                     <input
//                       type="number"
//                       id="cost_of_box"
//                       name="costOfBox"
//                       className="form-control"
//                       value={formData.costOfBox}
//                       onChange={handleInputChange}
//                     />
//                   </div>

//                   <div className="form-group mb-3">
//                     <label htmlFor="boxes_bonus_per_yield">Boxes bonus per yield per Acre ($):</label>
//                     <input
//                       type="number"
//                       id="boxes_bonus_per_yield"
//                       name="boxesBonusPerYield"
//                       className="form-control"
//                       value={formData.boxesBonusPerYield}
//                       onChange={handleInputChange}
//                     />
//                   </div>
//                   {/* END NEW FIELDS */}

//                   <button type="submit" className="btn btn-primary">
//                     Calculate
//                   </button>
//                 </form>
//               </div>

//               {/* Results Section */}
//               <div className="col-md-6">
//   {forecastData ? (
//     <>
//       <div className="card Forecast-Results">
//         <div className="card-body">
//           <h2>Forecast Results</h2>
//           <table className="table table-bordered">
//             <tbody>
//               <tr>
//                 <th>Forecasted Price per Box</th>
//                 <td>${forecastData.forecasted_price}</td>
//               </tr>
//               <tr>
//                 <th>Revenue per Acre</th>
//                 <td>${forecastData.revenue_per_acre}</td>
//               </tr>
//               <tr>
//                 <th>Revenue Per Acre after costings</th>
//                 <td>
//                   {forecastData.revenue_per_acre_after_costings !== undefined
//                     ? `$${forecastData.revenue_per_acre_after_costings}`
//                     : 'N/A'}
//                 </td>
//               </tr>
//               <tr>
//                 <th>Season for Forecast Date</th>
//                 <td>{forecastData.season}</td>
//               </tr>
//             </tbody>
//           </table>
//         </div>
//       </div>

//       <div className="card Forecast-Results mt-3">
//         <div className="card-body">
//           <h2>Try a Custom Price</h2>
//           <div className="form-group mb-3">
//             <label>Custom Price per Box ($):</label>
//             <input
//               type="number"
//               className="form-control"
//               value={customPrice}
//               onChange={handleCustomPriceChange}
//             />
//           </div>
//           <div className="form-group mb-3">
//             <label>Revenue per Acre (Custom):</label>
//             <input
//               type="text"
//               className="form-control"
//               readOnly
//               value={
//                 customRevenue !== ''
//                   ? `$${parseFloat(customRevenue).toFixed(2)}`
//                   : ''
//               }
//             />
//           </div>
//         </div>
//       </div>
//     </>
//   ) : (
//     <p>No forecast available. Please enter the data and submit the form.</p>
//   )}
// </div>

//             </div>

   



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



import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import Header from '../components/header';
import Footer from '../components/footer';
import { Link } from 'react-router-dom';
import '../styles/adminDashboard.css';

// Register the datalabels plugin globally
Chart.register(ChartDataLabels);

function AdminDashboard() {
  const [user, setUser] = useState({
    isAuthenticated: false,
    isAdmin: false,
    isOwner: false,
  });

  // On mount, verify the user session
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('No token found');

        const response = await axios.get('/api/current_user', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userData = response.data;
        setUser({
          isAuthenticated: true,
          isAdmin: userData.role === 'admin',
          isOwner: userData.role === 'owner',
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        if (error.response && error.response.status === 401) {
          alert('Session expired. Please log in again.');
          localStorage.removeItem('authToken');
        }
        setUser({ isAuthenticated: false, isAdmin: false, isOwner: false });
      }
    };
    fetchUser();
  }, []);

  // Commodity selection + forecast data
  const [variety, setVariety] = useState('Shishito');
  const [forecastData, setForecastData] = useState(null);
  const [chart, setChart] = useState(null);

  // Main form data (includes cost fields)
  const [formData, setFormData] = useState({
    startDate: '',
    forecastDate: '',
    yieldPerAcre: '',
    costPerAcre: '',
    harvestCostPerBox: '',
    costOfBox: '',
    boxesBonusPerYield: '',
  });

  // Custom price states
  const [customPrice, setCustomPrice] = useState('');
  const [customRevenue, setCustomRevenue] = useState('');
  const [customRevenueAfterCosts, setCustomRevenueAfterCosts] = useState('');

  // Handle changes in the main form
  const handleInputChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  /**
   * Recalculate "Try a Custom Price" purely in the frontend,
   * using the *same cost logic* as the backend.
   */
  const handleCustomPriceChange = (e) => {
    const newPrice = parseFloat(e.target.value) || 0;
    setCustomPrice(e.target.value); // keep the raw input in state

    // Pull numeric fields from formData
    const ypa = parseFloat(formData.yieldPerAcre) || 0;
    const cpa = parseFloat(formData.costPerAcre) || 0;
    const hc  = parseFloat(formData.harvestCostPerBox) || 0;
    const cob = parseFloat(formData.costOfBox) || 0;
    const bb  = parseFloat(formData.boxesBonusPerYield) || 0;

    // 1) Revenue per acre
    const newRevenue = newPrice * ypa;

    // 2) Same total cost formula as /api/calculate_forecast
    const totalCosts = cpa + (hc * ypa) + (cob * ypa) + bb ;

    // 3) Net revenue
    const newRevenueAfter = newPrice === 0 ? 0 : newRevenue - totalCosts;

    setCustomRevenue(newRevenue.toFixed(2));
    setCustomRevenueAfterCosts(newRevenueAfter.toFixed(2));
    
  };

  /**
   * Load seasonal prices for the chosen variety, then draw bar chart.
   */
  const updateChart = async () => {
    if (!variety) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token found');

      const response = await axios.get('/api/seasonal_prices', {
        headers: { Authorization: `Bearer ${token}` },
        params: { variety },
      });

      const data = response.data;
      const canvas = document.getElementById('seasonPriceChart');
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (chart) chart.destroy();

      const newChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Spring', 'Summer', 'Autumn', 'Winter'],
          datasets: [
            {
              label: `Forecasted Price per Box for ${variety}`,
              data: [data.Spring, data.Summer, data.Autumn, data.Winter],
              backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
              borderColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
              borderWidth: 0.3,
              barPercentage: 0.4,
              categoryPercentage: 1,
            },
          ],
        },
        plugins: [ChartDataLabels],
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            datalabels: {
              color: 'black',
              anchor: 'end',
              align: 'top',
              formatter: (value) => `$${value}`,
            },
          },
          scales: {
            x: {
              ticks: { color: 'black' },
            },
            y: {
              ticks: { color: 'black' },
              title: {
                display: true,
                text: 'Price ($)',
                color: 'black',
              },
            },
          },
        },
      });
      setChart(newChart);
    } catch (error) {
      console.error('Error fetching seasonal prices:', error);
      if (error.response && error.response.status === 401) {
        alert('Session expired. Please log in again.');
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    }
  };

  /**
   * Submit the main forecast form to /api/calculate_forecast
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token found');

      // Gather the payload
      const payload = {
        variety,
        start_date: formData.startDate,
        forecast_date: formData.forecastDate,
        yield_per_acre: formData.yieldPerAcre,
        cost_per_acre: formData.costPerAcre,
        harvest_cost_per_box: formData.harvestCostPerBox,
        cost_of_box: formData.costOfBox,
        boxes_bonus_per_yield: formData.boxesBonusPerYield,
      };

      const response = await axios.post('/api/calculate_forecast', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setForecastData(response.data);

      // Reset custom price fields whenever a new forecast is loaded
      setCustomPrice('');
      setCustomRevenue('');
      setCustomRevenueAfterCosts('');
    } catch (error) {
      console.error('Error calculating forecast:', error.response?.data || error.message);
      alert(`Error: ${error.response?.data?.error || 'Unable to calculate forecast.'}`);
    }
  };

  // Whenever variety changes, update the chart
  useEffect(() => {
    updateChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variety]);

  return (
    <div>
      <Header
        isAuthenticated={user.isAuthenticated}
        isAdmin={user.isAdmin}
        isOwner={user.isOwner}
      />
      <div className="container adminDash-section">
        <div className="mt-3 mb-3">
          <Link to="/approve_users" className="btn btn-primary">
            Approve Users
          </Link>
        </div>
        <h1 className="mt-4">Admin Dashboard</h1>
        <p>Welcome, Admin! You have Admin privileges.</p>

        {/* Tabs (only 1 tab for yield calculator) */}
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <a className="nav-link active" data-toggle="tab">
              Yield Calculator
            </a>
          </li>
        </ul>

        <div className="tab-content">
          <div className="tab-pane fade show active" id="yield-calculator">
            <div className="row mt-4">
              {/* Left column: Input Form */}
              <div className="col-md-6">
                <form onSubmit={handleSubmit}>
                  <div className="form-group mb-3">
                    <label>Select Variety:</label>
                    <select
                      className="form-control"
                      value={variety}
                      onChange={(e) => setVariety(e.target.value)}
                    >
                      <option value="Shishito">Shishito</option>
                      <option value="Anaheim">Anaheim</option>
                      <option value="Cubanelle">Cubanelles</option>
                      <option value="Fresno">Fresno</option>
                      <option value="Habanero">Habanero</option>
                      <option value="Hungarian Wax">Hungarian Wax</option>
                      <option value="Jalapeno">Jalapeno</option>
                      <option value="Long Hot">Long Hot</option>
                      <option value="Poblano">Poblano</option>
                      <option value="Serrano">Serrano</option>
                    </select>
                  </div>

                  <div className="form-group mb-3">
                    <label>Enter Start Date:</label>
                    <input
                      type="date"
                      name="startDate"
                      className="form-control"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group mb-3">
                    <label>Enter Forecast Date:</label>
                    <input
                      type="date"
                      name="forecastDate"
                      className="form-control"
                      value={formData.forecastDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group mb-3">
                    <label>Enter Yield per Acre (Boxes per Acre):</label>
                    <input
                      type="number"
                      name="yieldPerAcre"
                      className="form-control"
                      value={formData.yieldPerAcre}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Cost fields */}
                  <div className="form-group mb-3">
                    <label>Cost per Acre ($):</label>
                    <input
                      type="number"
                      name="costPerAcre"
                      className="form-control"
                      value={formData.costPerAcre}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group mb-3">
                    <label>Harvest cost per box ($):</label>
                    <input
                      type="number"
                      name="harvestCostPerBox"
                      className="form-control"
                      value={formData.harvestCostPerBox}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group mb-3">
                    <label>Cost of box ($):</label>
                    <input
                      type="number"
                      name="costOfBox"
                      className="form-control"
                      value={formData.costOfBox}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group mb-3">
                    <label>Boxes bonus per yield per Acre ($):</label>
                    <input
                      type="number"
                      name="boxesBonusPerYield"
                      className="form-control"
                      value={formData.boxesBonusPerYield}
                      onChange={handleInputChange}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary">
                    Calculate
                  </button>
                </form>
              </div>

              {/* Right column: Forecast results + Custom Price */}
              <div className="col-md-6">
                {forecastData ? (
                  <>
                    {/* Forecast Results card */}
                    <div className="card Forecast-Results">
                      <div className="card-body">
                        <h2>Forecast Results</h2>
                        <table className="table table-bordered">
                          <tbody>
                            <tr>
                              <th>Forecasted Price per Box</th>
                              <td>${forecastData.forecasted_price}</td>
                            </tr>
                            <tr>
                              <th>Revenue per Acre</th>
                              <td>${forecastData.revenue_per_acre}</td>
                            </tr>
                            <tr>
                              <th>Revenue Per Acre after costings</th>
                              <td>
                                {forecastData.revenue_per_acre_after_costings !== undefined
                                  ? `$${forecastData.revenue_per_acre_after_costings}`
                                  : 'N/A'}
                              </td>
                            </tr>
                            <tr>
                              <th>Season for Forecast Date</th>
                              <td>{forecastData.season}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>


                    <hr />

                    {/* Custom Price card */}
                    <div className="card Forecast-Results mt-3">
                      <div className="card-body">
                        <h2>Try a Custom Forecasted Price</h2>
                        <table className="table table-bordered">
                          <tbody>
                            <tr>
                              <th>Forecasted Price per Box</th>
                              <td>
                                <input
                                  type="number"
                                  className="form-control"
                                  value={customPrice}
                                  onChange={handleCustomPriceChange}
                                />
                              </td>
                            </tr>
                            <tr>
                              <th>Revenue per Acre</th>
                              <td>
                                {customRevenue
                                  ? `$${customRevenue}`
                                  : ''}
                              </td>
                            </tr>
                            <tr>
                              <th>Revenue per Acre after costings</th>
                              <td>
                                {customRevenueAfterCosts
                                  ? `$${customRevenueAfterCosts}`
                                  : ''}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <p>No forecast available. Please enter the data and submit the form.</p>
                )}
              </div>
            </div>

            <hr />
            <div className="row">
              <div className="col-md-12">
                <h2>Analytics: Forecasted Prices by Season</h2>
                <canvas id="seasonPriceChart"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default AdminDashboard;
