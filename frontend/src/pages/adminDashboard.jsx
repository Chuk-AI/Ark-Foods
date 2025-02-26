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

//   // On mount, verify the user session
//   useEffect(() => {
//     const fetchUser = async () => {
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
//     };
//     fetchUser();
//   }, []);

//   // Commodity selection + forecast data
//   const [variety, setVariety] = useState('Shishito');
//   const [forecastData, setForecastData] = useState(null);
//   const [chart, setChart] = useState(null);

//   // Main form data (includes cost fields)
//   const [formData, setFormData] = useState({
//     startDate: '',
//     forecastDate: '',
//     yieldPerAcre: '',
//     costPerAcre: '',
//     harvestCostPerBox: '',
//     costOfBox: '',
//     boxesBonusPerYield: '',
//   });

//   // Custom price states
//   const [customPrice, setCustomPrice] = useState('');
//   const [customRevenue, setCustomRevenue] = useState('');
//   const [customRevenueAfterCosts, setCustomRevenueAfterCosts] = useState('');

//   // Revenue calculator table
//   const [revenueTableData, setRevenueTableData] = useState([]);
//   const [showRevenueCalculator, setShowRevenueCalculator] = useState(false);
  
//   // Total summary values
//   const [totalRevenue, setTotalRevenue] = useState(0);
//   const [totalCostings, setTotalCostings] = useState(0);
//   const [totalNetMargin, setTotalNetMargin] = useState(0);

//   // Handle changes in the main form
//   const handleInputChange = (e) => {
//     setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
//   };

//   /**
//    * Recalculate "Try a Custom Price" purely in the frontend,
//    * using the *same cost logic* as the backend.
//    */
//   const handleCustomPriceChange = (e) => {
//     const newPrice = parseFloat(e.target.value) || 0;
//     setCustomPrice(e.target.value); // keep the raw input in state

//     // Pull numeric fields from formData
//     const ypa = parseFloat(formData.yieldPerAcre) || 0;
//     const cpa = parseFloat(formData.costPerAcre) || 0;
//     const hc  = parseFloat(formData.harvestCostPerBox) || 0;
//     const cob = parseFloat(formData.costOfBox) || 0;
//     const bb  = parseFloat(formData.boxesBonusPerYield) || 0;

//     // 1) Revenue per acre
//     const newRevenue = newPrice * ypa;

//     // 2) Same total cost formula as /api/calculate_forecast
//     const totalCosts = cpa + (hc * ypa) + (cob * ypa) + bb ;

//     // 3) Net revenue
//     const newRevenueAfter = newPrice === 0 ? 0 : newRevenue - totalCosts;

//     setCustomRevenue(newRevenue.toFixed(2));
//     setCustomRevenueAfterCosts(newRevenueAfter.toFixed(2));
//   };

//   /**
//    * Load seasonal prices for the chosen variety, then draw bar chart.
//    */
//   const updateChart = async () => {
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
//             legend: { display: false },
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
//             },
//             y: {
//               ticks: { color: 'black' },
//               title: {
//                 display: true,
//                 text: 'Price ($)',
//                 color: 'black',
//               },
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
//       }
//     }
//   };

//   /**
//    * Add a variety to the revenue table
//    */
//   const addVarietyToTable = () => {
//     // Default empty row with current form data
//     const newRow = {
//       id: Date.now(), // Unique ID for the row
//       variety: '',
//       yieldPerAcre: '',
//       costPerAcre: '',
//       harvestCostPerBox: '',
//       costOfBox: '',
//       boxesBonusPerYield: '',
//       forecastedPrice: 0,
//       revenuePerAcre: 0,
//       revenuePerAcreAfterCostings: 0,
//       customForecastedPrice: '',
//       customRevenuePerAcre: 0,
//       customRevenuePerAcreAfterCostings: 0
//     };
    
//     setRevenueTableData([...revenueTableData, newRow]);
//   };

//   /**
//    * Remove a variety from the revenue table
//    */
//   const removeVarietyFromTable = (id) => {
//     const updatedTable = revenueTableData.filter(row => row.id !== id);
//     setRevenueTableData(updatedTable);
//     calculateTotals(updatedTable);
//   };

//   /**
//    * Update a specific field in the revenue table
//    */
//   const handleTableInputChange = async (id, field, value) => {
//     const updatedTable = revenueTableData.map(row => {
//       if (row.id === id) {
//         const updatedRow = { ...row, [field]: value };
        
//         // Calculate revenue fields based on input values
//         if (field === 'variety' || field === 'yieldPerAcre' || field === 'costPerAcre' || 
//             field === 'harvestCostPerBox' || field === 'costOfBox' || field === 'boxesBonusPerYield') {
          
//           // Try to fetch forecasted price if variety is changed
//           if (field === 'variety' && value) {
//             fetchForcastedPriceForVariety(id, value, updatedRow);
//           } else {
//             // Recalculate with existing forecasted price
//             calculateRowRevenues(updatedRow);
//           }
//         }
        
//         // Calculate custom revenue fields if custom price is changed
//         if (field === 'customForecastedPrice') {
//           calculateCustomRowRevenues(updatedRow);
//         }
        
//         return updatedRow;
//       }
//       return row;
//     });
    
//     setRevenueTableData(updatedTable);
//     calculateTotals(updatedTable);
//   };

//   /**
//    * Fetch forecasted price for a specific variety
//    */
//   const fetchForcastedPriceForVariety = async (id, varietyValue, rowData) => {
//     if (!varietyValue || !formData.startDate || !formData.forecastDate) return;
    
//     try {
//       const token = localStorage.getItem('authToken');
//       if (!token) throw new Error('No token found');

//       const payload = {
//         variety: varietyValue,
//         start_date: formData.startDate,
//         forecast_date: formData.forecastDate,
//         yield_per_acre: rowData.yieldPerAcre || 0,
//         cost_per_acre: rowData.costPerAcre || 0,
//         harvest_cost_per_box: rowData.harvestCostPerBox || 0,
//         cost_of_box: rowData.costOfBox || 0,
//         boxes_bonus_per_yield: rowData.boxesBonusPerYield || 0,
//       };

//       const response = await axios.post('/api/calculate_forecast', payload, {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       const updatedTable = revenueTableData.map(row => {
//         if (row.id === id) {
//           const updatedRow = { 
//             ...row, 
//             forecastedPrice: response.data.forecasted_price 
//           };
//           return calculateRowRevenues(updatedRow);
//         }
//         return row;
//       });
      
//       setRevenueTableData(updatedTable);
//       calculateTotals(updatedTable);
//     } catch (error) {
//       console.error('Error fetching forecast for variety:', error);
//     }
//   };

//   /**
//    * Calculate revenue fields for a row
//    */
//   const calculateRowRevenues = (row) => {
//     const ypa = parseFloat(row.yieldPerAcre) || 0;
//     const cpa = parseFloat(row.costPerAcre) || 0;
//     const hc = parseFloat(row.harvestCostPerBox) || 0;
//     const cob = parseFloat(row.costOfBox) || 0;
//     const bb = parseFloat(row.boxesBonusPerYield) || 0;
//     const price = parseFloat(row.forecastedPrice) || 0;
    
//     // Calculate revenue
//     const revenue = price * ypa;
    
//     // Calculate total costs
//     const totalCosts = cpa + (hc * ypa) + (cob * ypa) + bb;
    
//     // Calculate net revenue
//     const netRevenue = revenue - totalCosts;
    
//     // Update the row
//     row.revenuePerAcre = revenue.toFixed(2);
//     row.revenuePerAcreAfterCostings = netRevenue.toFixed(2);
    
//     return row;
//   };

//   /**
//    * Calculate custom revenue fields for a row
//    */
//   const calculateCustomRowRevenues = (row) => {
//     const ypa = parseFloat(row.yieldPerAcre) || 0;
//     const cpa = parseFloat(row.costPerAcre) || 0;
//     const hc = parseFloat(row.harvestCostPerBox) || 0;
//     const cob = parseFloat(row.costOfBox) || 0;
//     const bb = parseFloat(row.boxesBonusPerYield) || 0;
//     const customPrice = parseFloat(row.customForecastedPrice) || 0;
    
//     // Calculate custom revenue
//     const customRevenue = customPrice * ypa;
    
//     // Calculate total costs
//     const totalCosts = cpa + (hc * ypa) + (cob * ypa) + bb;
    
//     // Calculate net custom revenue
//     const netCustomRevenue = customRevenue - totalCosts;
    
//     // Update the row
//     row.customRevenuePerAcre = customRevenue.toFixed(2);
//     row.customRevenuePerAcreAfterCostings = netCustomRevenue.toFixed(2);
    
//     return row;
//   };

//   /**
//    * Calculate total summary values
//    */
//   const calculateTotals = (tableData) => {
//     let totalRev = 0;
//     let totalCost = 0;
//     let totalNet = 0;
    
//     tableData.forEach(row => {
//       // Use custom values if available, otherwise use forecasted values
//       const revenue = row.customForecastedPrice 
//         ? parseFloat(row.customRevenuePerAcre) || 0
//         : parseFloat(row.revenuePerAcre) || 0;
        
//       const net = row.customForecastedPrice 
//         ? parseFloat(row.customRevenuePerAcreAfterCostings) || 0
//         : parseFloat(row.revenuePerAcreAfterCostings) || 0;
        
//       totalRev += revenue;
//       totalNet += net;
//     });
    
//     // Calculate total costings
//     totalCost = totalRev - totalNet;
    
//     setTotalRevenue(totalRev.toFixed(2));
//     setTotalCostings(totalCost.toFixed(2));
//     setTotalNetMargin(totalNet.toFixed(2));
//   };

//   /**
//    * Submit the main forecast form to /api/calculate_forecast
//    */
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const token = localStorage.getItem('authToken');
//       if (!token) throw new Error('No token found');

//       // Gather the payload
//       const payload = {
//         variety,
//         start_date: formData.startDate,
//         forecast_date: formData.forecastDate,
//         yield_per_acre: formData.yieldPerAcre,
//         cost_per_acre: formData.costPerAcre,
//         harvest_cost_per_box: formData.harvestCostPerBox,
//         cost_of_box: formData.costOfBox,
//         boxes_bonus_per_yield: formData.boxesBonusPerYield,
//       };

//       const response = await axios.post('/api/calculate_forecast', payload, {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       setForecastData(response.data);

//       // Reset custom price fields whenever a new forecast is loaded
//       setCustomPrice('');
//       setCustomRevenue('');
//       setCustomRevenueAfterCosts('');
      
//       // Initialize revenue calculator with current variety
//       const initialRow = {
//         id: Date.now(),
//         variety: variety,
//         yieldPerAcre: formData.yieldPerAcre,
//         costPerAcre: formData.costPerAcre,
//         harvestCostPerBox: formData.harvestCostPerBox,
//         costOfBox: formData.costOfBox,
//         boxesBonusPerYield: formData.boxesBonusPerYield,
//         forecastedPrice: response.data.forecasted_price,
//         revenuePerAcre: response.data.revenue_per_acre,
//         revenuePerAcreAfterCostings: response.data.revenue_per_acre_after_costings,
//         customForecastedPrice: '',
//         customRevenuePerAcre: 0,
//         customRevenuePerAcreAfterCostings: 0
//       };
      
//       setRevenueTableData([initialRow]);
//       setShowRevenueCalculator(true);
      
//       // Calculate initial totals
//       calculateTotals([initialRow]);
      
//     } catch (error) {
//       console.error('Error calculating forecast:', error.response?.data || error.message);
//       alert(`Error: ${error.response?.data?.error || 'Unable to calculate forecast.'}`);
//     }
//   };

//   // Whenever variety changes, update the chart
//   useEffect(() => {
//     updateChart();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [variety]);

//   return (
//     <div>
//       <Header
//         isAuthenticated={user.isAuthenticated}
//         isAdmin={user.isAdmin}
//         isOwner={user.isOwner}
//       />
//       <div className="container adminDash-section">
//         <div className="mt-3 mb-3">
//           <Link to="/approve_users" className="btn btn-primary">
//             Approve Users
//           </Link>
//         </div>
//         <h1 className="mt-4">Admin Dashboard</h1>
//         <p>Welcome, Admin! You have Admin privileges.</p>

//         {/* Tabs (only 1 tab for yield calculator) */}
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
//               {/* Left column: Input Form */}
//               <div className="col-md-6">
//                 <form onSubmit={handleSubmit}>
//                   <div className="form-group mb-3">
//                     <label>Select Variety:</label>
//                     <select
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
//                     <label>Enter Yield per Acre (Boxes per Acre):</label>
//                     <input
//                       type="number"
//                       name="yieldPerAcre"
//                       className="form-control"
//                       value={formData.yieldPerAcre}
//                       onChange={handleInputChange}
//                       required
//                     />
//                   </div>

//                   {/* Cost fields */}
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
//                     {/* Forecast Results card */}
//                     <div className="card Forecast-Results">
//                       <div className="card-body">
//                         <h2>Forecast Results</h2>
//                         <table className="table table-bordered">
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
//                               <th>Revenue Per Acre after costings</th>
//                               <td>
//                                 {forecastData.revenue_per_acre_after_costings !== undefined
//                                   ? `$${forecastData.revenue_per_acre_after_costings}`
//                                   : 'N/A'}
//                               </td>
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
//                         <table className="table table-bordered">
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
//                                 {customRevenue
//                                   ? `$${customRevenue}`
//                                   : ''}
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
//                   <p>No forecast available. Please enter the data and submit the form.</p>
//                 )}
//               </div>
//             </div>

//             {/* Revenue Calculator Section */}
//             {showRevenueCalculator && (
//               <div className="row mt-4">
//                 <div className="col-md-12">
//                   <h2>Revenue Calculator</h2>
                  
//                   <div className="summary-section mb-3">
//                     <h3>Summary</h3>
//                     <p>
//                       The total Forecasted Revenue of your Selected Varieties is ${totalRevenue} and 
//                       after the costings which are ${totalCostings}, your net margin will be ${totalNetMargin}
//                     </p>
//                   </div>
                  
//                   <div className="table-responsive">
//                     <table className="table table-bordered">
//                       <thead>
//                         <tr>
//                           <th>
//                             Variety 
//                             <button 
//                               type="button" 
//                               className="btn btn-sm btn-primary ml-2"
//                               onClick={addVarietyToTable}
//                             >
//                               +
//                             </button>
//                           </th>
//                           <th>Yield / Acre</th>
//                           <th>Cost / Acre</th>
//                           <th>Harvest Cost / Box</th>
//                           <th>Cost of Box</th>
//                           <th>Boxes Bonus</th>
//                           <th>Forecasted Price / Box</th>
//                           <th>Revenue / Acre</th>
//                           <th>Revenue / Acre after Costings</th>
//                           <th>Custom Forecasted Price</th>
//                           <th>Custom Revenue / Acre</th>
//                           <th>Custom Revenue / Acre after Costings</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {revenueTableData.map((row) => (
//                           <tr key={row.id}>
//                             <td>
//                               <select 
//                                 className="form-control"
//                                 value={row.variety} 
//                                 onChange={(e) => handleTableInputChange(row.id, 'variety', e.target.value)}
//                               >
//                                 <option value="">Select Variety</option>
//                                 <option value="Shishito">Shishito</option>
//                                 <option value="Anaheim">Anaheim</option>
//                                 <option value="Cubanelle">Cubanelles</option>
//                                 <option value="Fresno">Fresno</option>
//                                 <option value="Habanero">Habanero</option>
//                                 <option value="Hungarian Wax">Hungarian Wax</option>
//                                 <option value="Jalapeno">Jalapeno</option>
//                                 <option value="Long Hot">Long Hot</option>
//                                 <option value="Poblano">Poblano</option>
//                                 <option value="Serrano">Serrano</option>
//                               </select>
//                             </td>
//                             <td>
//                               <input 
//                                 type="number" 
//                                 className="form-control" 
//                                 value={row.yieldPerAcre}
//                                 onChange={(e) => handleTableInputChange(row.id, 'yieldPerAcre', e.target.value)}
//                               />
//                             </td>
//                             <td>
//                               <input 
//                                 type="number" 
//                                 className="form-control" 
//                                 value={row.costPerAcre}
//                                 onChange={(e) => handleTableInputChange(row.id, 'costPerAcre', e.target.value)}
//                               />
//                             </td>
//                             <td>
//                               <input 
//                                 type="number" 
//                                 className="form-control" 
//                                 value={row.harvestCostPerBox}
//                                 onChange={(e) => handleTableInputChange(row.id, 'harvestCostPerBox', e.target.value)}
//                               />
//                             </td>
//                             <td>
//                               <input 
//                                 type="number" 
//                                 className="form-control" 
//                                 value={row.costOfBox}
//                                 onChange={(e) => handleTableInputChange(row.id, 'costOfBox', e.target.value)}
//                               />
//                             </td>
//                             <td>
//                               <input 
//                                 type="number" 
//                                 className="form-control" 
//                                 value={row.boxesBonusPerYield}
//                                 onChange={(e) => handleTableInputChange(row.id, 'boxesBonusPerYield', e.target.value)}
//                               />
//                             </td>
//                             <td>${row.forecastedPrice}</td>
//                             <td>${row.revenuePerAcre}</td>
//                             <td>${row.revenuePerAcreAfterCostings}</td>
//                             <td>
//                               <input 
//                                 type="number" 
//                                 className="form-control" 
//                                 value={row.customForecastedPrice}
//                                 onChange={(e) => handleTableInputChange(row.id, 'customForecastedPrice', e.target.value)}
//                               />
//                             </td>
//                             <td>${row.customRevenuePerAcre}</td>
//                             <td>${row.customRevenuePerAcreAfterCostings}</td>
                     
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>
//               </div>
//             )}

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

  // Custom price states for the single forecast card
  const [customPrice, setCustomPrice] = useState('');
  const [customRevenue, setCustomRevenue] = useState('');
  const [customRevenueAfterCosts, setCustomRevenueAfterCosts] = useState('');

  // The table data
  const [revenueTableData, setRevenueTableData] = useState([]);
  const [showRevenueCalculator, setShowRevenueCalculator] = useState(false);

  // Totals
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCostings, setTotalCostings] = useState(0);
  const [totalNetMargin, setTotalNetMargin] = useState(0);

  // On form change
  const handleInputChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Single custom price logic
  const handleCustomPriceChange = (e) => {
    const newPrice = parseFloat(e.target.value) || 0;
    setCustomPrice(e.target.value);

    const ypa = parseFloat(formData.yieldPerAcre) || 0;
    const cpa = parseFloat(formData.costPerAcre) || 0;
    const hc  = parseFloat(formData.harvestCostPerBox) || 0;
    const cob = parseFloat(formData.costOfBox) || 0;
    const bb  = parseFloat(formData.boxesBonusPerYield) || 0;

    const newRevenue = newPrice * ypa;
    const totalCosts = cpa + (hc * ypa) + (cob * ypa) + bb;
    const newRevenueAfter = newRevenue - totalCosts;

    setCustomRevenue(newRevenue.toFixed(2));
    setCustomRevenueAfterCosts(newRevenueAfter.toFixed(2));
  };

  // Chart
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
            x: { ticks: { color: 'black' } },
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

  useEffect(() => {
    updateChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variety]);

  // "Add variety" outside the table
  const addVarietyRow = () => {
    const newRow = {
      id: Date.now(),
      variety: '',
      yieldPerAcre: '',
      costPerAcre: '',
      harvestCostPerBox: '',
      costOfBox: '',
      boxesBonusPerYield: '',
      forecastedPrice: 0,
      revenuePerAcre: 0,
      revenuePerAcreAfterCostings: 0,
      customForecastedPrice: '',
      customRevenuePerAcre: 0,
      customRevenuePerAcreAfterCostings: 0,
    };
    setRevenueTableData((prev) => [...prev, newRow]);
  };

  // "Remove variety" on each row
  const removeVarietyRow = (rowId) => {
    const updated = revenueTableData.filter((r) => r.id !== rowId);
    setRevenueTableData(updated);
    calculateTotals(updated);
  };

  // handle changes in the table
  const handleTableInputChange = (rowId, field, value) => {
    const updated = revenueTableData.map((row) => {
      if (row.id === rowId) {
        return { ...row, [field]: value };
      }
      return row;
    });
    setRevenueTableData(updated);
  };

  // "Calculate All" button at bottom
  const handleCalculateAllRows = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token found');

      // For each row, call the backend
      const updated = await Promise.all(
        revenueTableData.map(async (row) => {
          if (!row.variety) return row; // skip empty variety

          // Build payload from row + main form dates
          const payload = {
            variety: row.variety,
            start_date: formData.startDate,   // from the yield calc form
            forecast_date: formData.forecastDate, // from yield calc
            yield_per_acre: row.yieldPerAcre || 0,
            cost_per_acre: row.costPerAcre || 0,
            harvest_cost_per_box: row.harvestCostPerBox || 0,
            cost_of_box: row.costOfBox || 0,
            boxes_bonus_per_yield: row.boxesBonusPerYield || 0,
          };

          const response = await axios.post('/api/calculate_forecast', payload, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const forecastedPrice = response.data.forecasted_price || 0;
          const revenuePerAcre = response.data.revenue_per_acre || 0;
          const revenueAfterCostings = response.data.revenue_per_acre_after_costings || 0;

          // Then recalc the row's custom columns if it has a customForecastedPrice
          let customRevenuePerAcre = 0;
          let customRevenuePerAcreAfterCostings = 0;
          if (row.customForecastedPrice) {
            // same logic
            const ypa = parseFloat(row.yieldPerAcre) || 0;
            const cpa = parseFloat(row.costPerAcre) || 0;
            const hc = parseFloat(row.harvestCostPerBox) || 0;
            const cob = parseFloat(row.costOfBox) || 0;
            const bb = parseFloat(row.boxesBonusPerYield) || 0;
            const cPrice = parseFloat(row.customForecastedPrice) || 0;

            customRevenuePerAcre = cPrice * ypa;
            const totalCost = cpa + (hc * ypa) + (cob * ypa) + bb;
            customRevenuePerAcreAfterCostings = customRevenuePerAcre - totalCost;
          }

          return {
            ...row,
            forecastedPrice,
            revenuePerAcre: revenuePerAcre.toFixed(2),
            revenueAfterCostings: revenueAfterCostings.toFixed(2),
            customRevenuePerAcre: customRevenuePerAcre.toFixed(2),
            customRevenuePerAcreAfterCostings: customRevenuePerAcreAfterCostings.toFixed(2),
          };
        })
      );

      setRevenueTableData(updated);
      calculateTotals(updated);
    } catch (error) {
      console.error('Error calculating all rows:', error);
      alert('Failed to recalc table rows.');
    }
  };

  // recalc summary totals
  const calculateTotals = (tableData) => {
    let totalRev = 0;
    let totalNet = 0;

    tableData.forEach((row) => {
      // If user entered customForecastedPrice, use custom columns
      if (row.customForecastedPrice) {
        totalRev += parseFloat(row.customRevenuePerAcre) || 0;
        totalNet += parseFloat(row.customRevenuePerAcreAfterCostings) || 0;
      } else {
        totalRev += parseFloat(row.revenuePerAcre) || 0;
        totalNet += parseFloat(row.revenueAfterCostings) || 0;
      }
    });

    const totalCost = totalRev - totalNet;
    setTotalRevenue(totalRev.toFixed(2));
    setTotalCostings(totalCost.toFixed(2));
    setTotalNetMargin(totalNet.toFixed(2));
  };

  // Single forecast form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token found');

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
      setCustomPrice('');
      setCustomRevenue('');
      setCustomRevenueAfterCosts('');

      // Initialize the table with one row
      const newRow = {
        id: Date.now(),
        variety,
        yieldPerAcre: formData.yieldPerAcre,
        costPerAcre: formData.costPerAcre,
        harvestCostPerBox: formData.harvestCostPerBox,
        costOfBox: formData.costOfBox,
        boxesBonusPerYield: formData.boxesBonusPerYield,
        forecastedPrice: response.data.forecasted_price.toFixed(2),
        revenuePerAcre: response.data.revenue_per_acre.toFixed(2),
        revenueAfterCostings: response.data.revenue_per_acre_after_costings.toFixed(2),
        customForecastedPrice: '',
        customRevenuePerAcre: 0,
        customRevenuePerAcreAfterCostings: 0,
      };
      setRevenueTableData([newRow]);
      setShowRevenueCalculator(true);

      // Recalc totals
      calculateTotals([newRow]);

    } catch (error) {
      console.error('Error calculating forecast:', error);
      alert('Unable to calculate forecast.');
    }
  };

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
                    <div className="card Forecast-Results">
                      <div className="card-body">
                        <h2>Forecast Results</h2>
                        <table className="table table-bordered table-sm">
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
                        <table className="table table-bordered table-sm">
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
                                {customRevenue ? `$${customRevenue}` : ''}
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

            {/* Revenue Calculator Section */}
            {showRevenueCalculator && (
              <div className="row mt-4">
                <div className="col-md-12">
                  <h2 style={{textAlign:'center'}}>Revenue Calculator</h2>

                  <div className="summary-section mb-3">
                    <h3>Summary</h3>
                    <p>
                      The total Forecasted Revenue of your Selected Varieties is 
                      <strong> ${totalRevenue}</strong> and 
                      after the costings which are 
                      <strong> ${totalCostings}</strong>, 
                      your net margin will be 
                      <strong> ${totalNetMargin}</strong>.
                    </p>
                  </div>

                  {/* "Add variety" button outside the table */}
                  <div className="mb-2">
                    <button 
                      type="button" 
                      className="btn btn-sm btn-success"
                      onClick={addVarietyRow}
                    >
                      + Add Variety
                    </button>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-bordered table-sm">
                      <thead>
                        <tr>
                          <th>Variety</th>
                          <th>Yield/Acre</th>
                          <th>Cost/Acre</th>
                          <th>Harvest $/Box</th>
                          <th>Cost of Box</th>
                          <th>Boxes Bonus</th>
                          <th>Forecast $</th>
                          <th>Revenue/Acre</th>
                          <th>Revenue/Acre After</th>
                          <th>Custom $</th>
                          <th>Custom Rev/Acre</th>
                          <th>Custom After</th>
                          <th></th> {/* for minus button */}
                        </tr>
                      </thead>
                      <tbody>
                        {revenueTableData.map((row) => (
                          <tr key={row.id}>
                            <td style={{ minWidth: '110px' }}>
                              <select 
                                className="form-control form-control-sm"
                                value={row.variety}
                                onChange={(e) => handleTableInputChange(row.id, 'variety', e.target.value)}
                              >
                                <option value="">Select Variety</option>
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
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={row.yieldPerAcre}
                                onChange={(e) => handleTableInputChange(row.id, 'yieldPerAcre', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={row.costPerAcre}
                                onChange={(e) => handleTableInputChange(row.id, 'costPerAcre', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={row.harvestCostPerBox}
                                onChange={(e) => handleTableInputChange(row.id, 'harvestCostPerBox', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={row.costOfBox}
                                onChange={(e) => handleTableInputChange(row.id, 'costOfBox', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={row.boxesBonusPerYield}
                                onChange={(e) => handleTableInputChange(row.id, 'boxesBonusPerYield', e.target.value)}
                              />
                            </td>
                            <td>${row.forecastedPrice}</td>
                            <td>${row.revenuePerAcre}</td>
                            <td>${row.revenuePerAcreAfterCostings}</td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={row.customForecastedPrice}
                                onChange={(e) => handleTableInputChange(row.id, 'customForecastedPrice', e.target.value)}
                              />
                            </td>
                            <td>${row.customRevenuePerAcre}</td>
                            <td>${row.customRevenuePerAcreAfterCostings}</td>

                            {/* Red minus button to remove row */}
                            <td>
                              <button 
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => removeVarietyRow(row.id)}
                              >
                                −
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Button at the bottom to recalc all new varieties */}
                  <button 
                    type="button"
                    className="btn btn-info mt-2"
                    onClick={handleCalculateAllRows}
                  >
                    Calculate Forecast for All Rows
                  </button>
                </div>
              </div>
            )}

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
