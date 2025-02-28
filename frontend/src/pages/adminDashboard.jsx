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

//   // Custom price states for the single forecast card
//   const [customPrice, setCustomPrice] = useState('');
//   const [customRevenue, setCustomRevenue] = useState('');
//   const [customRevenueAfterCosts, setCustomRevenueAfterCosts] = useState('');

//   // The table data
//   const [revenueTableData, setRevenueTableData] = useState([]);
//   const [showRevenueCalculator, setShowRevenueCalculator] = useState(false);

//   // Totals
//   const [totalRevenue, setTotalRevenue] = useState(0);
//   const [totalCostings, setTotalCostings] = useState(0);
//   const [totalNetMargin, setTotalNetMargin] = useState(0);

//   // On form change
//   const handleInputChange = (e) => {
//     setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
//   };

//   // Single custom price logic
//   const handleCustomPriceChange = (e) => {
//     const newPrice = parseFloat(e.target.value) || 0;
//     setCustomPrice(e.target.value);

//     const ypa = parseFloat(formData.yieldPerAcre) || 0;
//     const cpa = parseFloat(formData.costPerAcre) || 0;
//     const hc  = parseFloat(formData.harvestCostPerBox) || 0;
//     const cob = parseFloat(formData.costOfBox) || 0;
//     const bb  = parseFloat(formData.boxesBonusPerYield) || 0;

//     const newRevenue = newPrice * ypa;
//     const totalCosts = cpa + (hc * ypa) + (cob * ypa) + bb;
//     const newRevenueAfter = newRevenue - totalCosts;

//     setCustomRevenue(newRevenue.toFixed(2));
//     setCustomRevenueAfterCosts(newRevenueAfter.toFixed(2));
//   };

//   // Chart
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
//             x: { ticks: { color: 'black' } },
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

//   useEffect(() => {
//     updateChart();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [variety]);

//   // "Add variety" outside the table
//   const addVarietyRow = () => {
//     const newRow = {
//       id: Date.now(),
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
//       customRevenuePerAcreAfterCostings: 0,
//     };
//     setRevenueTableData((prev) => [...prev, newRow]);
//   };

//   // "Remove variety" on each row
//   const removeVarietyRow = (rowId) => {
//     const updated = revenueTableData.filter((r) => r.id !== rowId);
//     setRevenueTableData(updated);
//     calculateTotals(updated);
//   };

//   // handle changes in the table
//   const handleTableInputChange = (rowId, field, value) => {
//     const updated = revenueTableData.map((row) => {
//       if (row.id === rowId) {
//         return { ...row, [field]: value };
//       }
//       return row;
//     });
//     setRevenueTableData(updated);
//   };

//   // "Calculate All" button at bottom
//   const handleCalculateAllRows = async () => {
//     try {
//       const token = localStorage.getItem('authToken');
//       if (!token) throw new Error('No token found');

//       // For each row, call the backend
//       const updated = await Promise.all(
//         revenueTableData.map(async (row) => {
//           if (!row.variety) return row; // skip empty variety

//           // Build payload from row + main form dates
//           const payload = {
//             variety: row.variety,
//             start_date: formData.startDate,   // from the yield calc form
//             forecast_date: formData.forecastDate, // from yield calc
//             yield_per_acre: row.yieldPerAcre || 0,
//             cost_per_acre: row.costPerAcre || 0,
//             harvest_cost_per_box: row.harvestCostPerBox || 0,
//             cost_of_box: row.costOfBox || 0,
//             boxes_bonus_per_yield: row.boxesBonusPerYield || 0,
//           };

//           const response = await axios.post('/api/calculate_forecast', payload, {
//             headers: { Authorization: `Bearer ${token}` },
//           });

//           const forecastedPrice = response.data.forecasted_price || 0;
//           const revenuePerAcre = response.data.revenue_per_acre || 0;
//           const revenueAfterCostings = response.data.revenue_per_acre_after_costings || 0;

//           // Then recalc the row's custom columns if it has a customForecastedPrice
//           let customRevenuePerAcre = 0;
//           let customRevenuePerAcreAfterCostings = 0;
//           if (row.customForecastedPrice) {
//             // same logic
//             const ypa = parseFloat(row.yieldPerAcre) || 0;
//             const cpa = parseFloat(row.costPerAcre) || 0;
//             const hc = parseFloat(row.harvestCostPerBox) || 0;
//             const cob = parseFloat(row.costOfBox) || 0;
//             const bb = parseFloat(row.boxesBonusPerYield) || 0;
//             const cPrice = parseFloat(row.customForecastedPrice) || 0;

//             customRevenuePerAcre = cPrice * ypa;
//             const totalCost = cpa + (hc * ypa) + (cob * ypa) + bb;
//             customRevenuePerAcreAfterCostings = customRevenuePerAcre - totalCost;
//           }

//           return {
//             ...row,
//             forecastedPrice,
//             revenuePerAcre: revenuePerAcre.toFixed(2),
//             revenueAfterCostings: revenueAfterCostings.toFixed(2),
//             customRevenuePerAcre: customRevenuePerAcre.toFixed(2),
//             customRevenuePerAcreAfterCostings: customRevenuePerAcreAfterCostings.toFixed(2),
//           };
//         })
//       );

//       setRevenueTableData(updated);
//       calculateTotals(updated);
//     } catch (error) {
//       console.error('Error calculating all rows:', error);
//       alert('Failed to recalc table rows.');
//     }
//   };

//   // recalc summary totals
//   const calculateTotals = (tableData) => {
//     let totalRev = 0;
//     let totalNet = 0;

//     tableData.forEach((row) => {
//       // If user entered customForecastedPrice, use custom columns
//       if (row.customForecastedPrice) {
//         totalRev += parseFloat(row.customRevenuePerAcre) || 0;
//         totalNet += parseFloat(row.customRevenuePerAcreAfterCostings) || 0;
//       } else {
//         totalRev += parseFloat(row.revenuePerAcre) || 0;
//         totalNet += parseFloat(row.revenueAfterCostings) || 0;
//       }
//     });

//     const totalCost = totalRev - totalNet;
//     setTotalRevenue(totalRev.toFixed(2));
//     setTotalCostings(totalCost.toFixed(2));
//     setTotalNetMargin(totalNet.toFixed(2));
//   };

//   // Single forecast form submission
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const token = localStorage.getItem('authToken');
//       if (!token) throw new Error('No token found');

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
//       setCustomPrice('');
//       setCustomRevenue('');
//       setCustomRevenueAfterCosts('');

//       // Initialize the table with one row
//       const newRow = {
//         id: Date.now(),
//         variety,
//         yieldPerAcre: formData.yieldPerAcre,
//         costPerAcre: formData.costPerAcre,
//         harvestCostPerBox: formData.harvestCostPerBox,
//         costOfBox: formData.costOfBox,
//         boxesBonusPerYield: formData.boxesBonusPerYield,
//         forecastedPrice: response.data.forecasted_price.toFixed(2),
//         revenuePerAcre: response.data.revenue_per_acre.toFixed(2),
//         revenueAfterCostings: response.data.revenue_per_acre_after_costings.toFixed(2),
//         customForecastedPrice: '',
//         customRevenuePerAcre: 0,
//         customRevenuePerAcreAfterCostings: 0,
//       };
//       setRevenueTableData([newRow]);
//       setShowRevenueCalculator(true);

//       // Recalc totals
//       calculateTotals([newRow]);

//     } catch (error) {
//       console.error('Error calculating forecast:', error);
//       alert('Unable to calculate forecast.');
//     }
//   };

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
//                   <p>No forecast available. Please enter the data and submit the form.</p>
//                 )}
//               </div>
//             </div>

//             {/* Revenue Calculator Section */}
//             {showRevenueCalculator && (
//               <div className="row mt-4">
//                 <div className="col-md-12">
//                   <h2 style={{textAlign:'center'}}>Revenue Calculator</h2>

//                   <div className="summary-section mb-3">
//                     <h3>Summary</h3>
//                     <p>
//                       The total Forecasted Revenue of your Selected Varieties is 
//                       <strong> ${totalRevenue}</strong> and 
//                       after the costings which are 
//                       <strong> ${totalCostings}</strong>, 
//                       your net margin will be 
//                       <strong> ${totalNetMargin}</strong>.
//                     </p>
//                   </div>

//                   {/* "Add variety" button outside the table */}
//                   <div className="mb-2">
//                     <button 
//                       type="button" 
//                       className="btn btn-sm btn-success"
//                       onClick={addVarietyRow}
//                     >
//                       + Add Variety
//                     </button>
//                   </div>

//                   <div className="table-responsive">
//                     <table className="table table-bordered table-sm">
//                       <thead>
//                         <tr>
//                           <th>Variety</th>
//                           <th>Yield/Acre</th>
//                           <th>Cost/Acre</th>
//                           <th>Harvest $/Box</th>
//                           <th>Cost of Box</th>
//                           <th>Boxes Bonus</th>
//                           <th>Forecast $</th>
//                           <th>Revenue/Acre</th>
//                           <th>Revenue/Acre After</th>
//                           <th>Custom $</th>
//                           <th>Custom Rev/Acre</th>
//                           <th>Custom Rev/Acre After</th>
//                           <th></th> {/* for minus button */}
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {revenueTableData.map((row) => (
//                           <tr key={row.id}>
//                             <td style={{ minWidth: '110px' }}>
//                               <select 
//                                 className="form-control form-control-sm"
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
//                                 className="form-control form-control-sm"
//                                 value={row.yieldPerAcre}
//                                 onChange={(e) => handleTableInputChange(row.id, 'yieldPerAcre', e.target.value)}
//                               />
//                             </td>
//                             <td>
//                               <input
//                                 type="number"
//                                 className="form-control form-control-sm"
//                                 value={row.costPerAcre}
//                                 onChange={(e) => handleTableInputChange(row.id, 'costPerAcre', e.target.value)}
//                               />
//                             </td>
//                             <td>
//                               <input
//                                 type="number"
//                                 className="form-control form-control-sm"
//                                 value={row.harvestCostPerBox}
//                                 onChange={(e) => handleTableInputChange(row.id, 'harvestCostPerBox', e.target.value)}
//                               />
//                             </td>
//                             <td>
//                               <input
//                                 type="number"
//                                 className="form-control form-control-sm"
//                                 value={row.costOfBox}
//                                 onChange={(e) => handleTableInputChange(row.id, 'costOfBox', e.target.value)}
//                               />
//                             </td>
//                             <td>
//                               <input
//                                 type="number"
//                                 className="form-control form-control-sm"
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
//                                 className="form-control form-control-sm"
//                                 value={row.customForecastedPrice}
//                                 onChange={(e) => handleTableInputChange(row.id, 'customForecastedPrice', e.target.value)}
//                               />
//                             </td>
//                             <td>${row.customRevenuePerAcre}</td>
//                             <td>${row.customRevenuePerAcreAfterCostings}</td>

//                             {/* Red minus button to remove row */}
//                             <td>
//                               <button 
//                                 type="button"
//                                 className="btn btn-sm btn-danger"
//                                 onClick={() => removeVarietyRow(row.id)}
//                               >
//                                 −
//                               </button>
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>

//                   {/* Button at the bottom to recalc all new varieties */}
//                   <button 
//                     type="button"
//                     className="btn btn-info mt-2"
//                     onClick={handleCalculateAllRows}
//                   >
//                     Calculate Forecast for All Rows
//                   </button>
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

  // 1) On mount, verify user session
  useEffect(() => {
    async function fetchUser() {
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
    }
    fetchUser();
  }, []);

  // Commodity selection + single forecast data
  const [variety, setVariety] = useState('Shishito');
  const [forecastData, setForecastData] = useState(null);

  // Main yield form
  const [formData, setFormData] = useState({
    startDate: '',
    forecastDate: '',
    yieldPerAcre: '',
    costPerAcre: '',
    harvestCostPerBox: '',
    costOfBox: '',
    boxesBonusPerYield: '',
  });

  // Single “Custom Price” logic for the top forecast card
  const [customPrice, setCustomPrice] = useState('');
  const [customRevenue, setCustomRevenue] = useState('');
  const [customRevenueAfterCosts, setCustomRevenueAfterCosts] = useState('');

  // The table data for the “Revenue Calculator”
  const [revenueTableData, setRevenueTableData] = useState(() => {
    try {
      const saved = localStorage.getItem('myRevenueTable');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  // Totals for summary
  const [totalRevenue, setTotalRevenue] = useState('0');
  const [totalCostings, setTotalCostings] = useState('0');
  const [totalNetMargin, setTotalNetMargin] = useState('0');


  // Custom totals for summary
const [totalCustomRevenue, setTotalCustomRevenue] = useState('0');
const [totalCustomCostings, setTotalCustomCostings] = useState('0');
const [totalCustomNetMargin, setTotalCustomNetMargin] = useState('0');


  // Chart instance
  const [chart, setChart] = useState(null);

  // --- 1) Load from localStorage on mount
  useEffect(() => {
    // In load useEffect
    const savedTable = localStorage.getItem('myRevenueTable');
    if (savedTable) {
      try {
        setRevenueTableData(JSON.parse(savedTable)); 
      } catch (e) {
        console.error("Invalid saved table data", e);
      }
    }

    
    const savedForm = localStorage.getItem('myYieldForm');
    if (savedForm) {
      const parsed = JSON.parse(savedForm);
      setVariety(parsed.variety || 'Shishito');
      setFormData((prev) => ({ ...prev, ...parsed }));
    }

    const savedSummary = localStorage.getItem('mySummary');
  if (savedSummary) {
    try {
      const parsedSummary = JSON.parse(savedSummary);
      setTotalRevenue(parsedSummary.totalRevenue || '0');
      setTotalCostings(parsedSummary.totalCostings || '0');
      setTotalNetMargin(parsedSummary.totalNetMargin || '0');

          // Also restore the custom totals:
      setTotalCustomRevenue(parsedSummary.totalCustomRevenue || '0');
      setTotalCustomCostings(parsedSummary.totalCustomCostings || '0');
      setTotalCustomNetMargin(parsedSummary.totalCustomNetMargin || '0');

    } catch (e) {
      console.error("Invalid summary data in localStorage", e);
    }
  }

  
  }, []);

  // --- 2) Whenever table changes, save to localStorage
  useEffect(() => {
    localStorage.setItem('myRevenueTable', JSON.stringify(revenueTableData));
  }, [revenueTableData]);

  // Also save form changes
  useEffect(() => {
    const toSave = { ...formData, variety };
    localStorage.setItem('myYieldForm', JSON.stringify(toSave));
  }, [formData, variety]);

  // Single yield form input changes
  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }
  function handleVarietyChange(e) {
    setVariety(e.target.value);
  }

  // Single custom price logic
  function handleCustomPriceChange(e) {
    const val = parseFloat(e.target.value) || 0;
    setCustomPrice(e.target.value);

    const ypa = parseFloat(formData.yieldPerAcre) || 0;
    const cpa = parseFloat(formData.costPerAcre) || 0;
    const hc  = parseFloat(formData.harvestCostPerBox) || 0;
    const cob = parseFloat(formData.costOfBox) || 0;
    const bb  = parseFloat(formData.boxesBonusPerYield) || 0;

    const rev = val * ypa;
    const totalC = cpa + (hc * ypa) + (cob * ypa) + bb;
    const revAfter = rev - totalC;

    setCustomRevenue(rev.toFixed(2));
    setCustomRevenueAfterCosts(revAfter.toFixed(2));
  }

  // Chart
  async function updateChart() {
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
              label: `Forecasted Price for ${variety}`,
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
              title: { display: true, text: 'Price ($)', color: 'black' },
            },
          },
        },
      });
      setChart(newChart);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  }

  useEffect(() => {
    updateChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variety]);

  // Helper to recalc a single row’s derived fields
  function computeRowTotals(row) {
    const ypa = parseFloat(row.yieldPerAcre) || 0;
    const cpa = parseFloat(row.costPerAcre) || 0;
    const hc  = parseFloat(row.harvestCostPerBox) || 0;
    const cob = parseFloat(row.costOfBox) || 0;
    const bb  = parseFloat(row.boxesBonusPerYield) || 0;
    const acreCount = parseFloat(row.acreCount) || 0;
  
    // 1) Forecast columns
    const forecastPrice = parseFloat(row.forecastedPrice) || 0;
    const revenueAcre   = forecastPrice * ypa;
    const totalCosts    = cpa + (hc * ypa) + (cob * ypa) + bb;
    const revenueAcreAfter = revenueAcre - totalCosts;
  
    row.revenuePerAcre             = revenueAcre.toFixed(2);
    row.revenuePerAcreAfterCostings= revenueAcreAfter.toFixed(2);
  
    const totalRev       = revenueAcre      * acreCount;
    const totalRevAfter  = revenueAcreAfter * acreCount;
    row.totalRevenue     = totalRev.toFixed(2);
    row.totalRevenueAfter= totalRevAfter.toFixed(2);
  
    // 2) Custom columns
    if (!row.customForecastedPrice || row.customForecastedPrice.trim() === "") {
      // If blank, skip or show zero/blank in custom columns
      row.customRevenuePerAcre             = "";
      row.customRevenuePerAcreAfterCostings= "";
      row.totalCustomRevenue               = "";
      row.totalCustomRevenueAfter          = "";
    } else {
      // If the user actually typed something:
      const customPriceNum = parseFloat(row.customForecastedPrice) || 0;
  
      const customRevAcre      = customPriceNum * ypa;
      const customRevAcreAfter = customRevAcre - totalCosts;
  
      row.customRevenuePerAcre             = customRevAcre.toFixed(2);
      row.customRevenuePerAcreAfterCostings= customRevAcreAfter.toFixed(2);
  
      const totCustomRev       = customRevAcre      * acreCount;
      const totCustomRevAfter  = customRevAcreAfter * acreCount;
  
      row.totalCustomRevenue    = totCustomRev.toFixed(2);
      row.totalCustomRevenueAfter = totCustomRevAfter.toFixed(2);
    }
  
    return row;
  }
  

  // Recalc entire table’s derived fields + summary
  function recalcTable(table) {
    let newTable = table.map((row) => computeRowTotals({ ...row }));

    let sumRevenue = 0;
    let sumNet = 0;

    let sumCustomRevenue = 0;
    let sumCustomNet = 0;

    newTable.forEach((row) => {
      // If user entered custom price, we could choose to sum custom columns
      // or always sum forecast columns. Here we sum forecast columns:
      sumRevenue += parseFloat(row.totalRevenue) || 0;
      sumNet += parseFloat(row.totalRevenueAfter) || 0;
          // Custom sums
      sumCustomRevenue += parseFloat(row.totalCustomRevenue) || 0;
      sumCustomNet     += parseFloat(row.totalCustomRevenueAfter) || 0;

    });

    let cost = sumRevenue - sumNet;

    let costCustom = sumCustomRevenue - sumCustomNet;


    const revenueStr = sumRevenue.toFixed(2);
    const costStr = cost.toFixed(2);
    const netStr = sumNet.toFixed(2);

    const customRevStr = sumCustomRevenue.toFixed(2);
    const customCostStr= costCustom.toFixed(2);
    const customNetStr = sumCustomNet.toFixed(2);

    
    setTotalRevenue(revenueStr);
    setTotalCostings(costStr);
    setTotalNetMargin(netStr);
  
    setTotalCustomRevenue(customRevStr);
    setTotalCustomCostings(customCostStr);
    setTotalCustomNetMargin(customNetStr);

    setRevenueTableData(newTable);


    localStorage.setItem('mySummary', JSON.stringify({
      totalRevenue:       revenueStr,
      totalCostings:      costStr,
      totalNetMargin:     netStr,
      totalCustomRevenue: customRevStr,
      totalCustomCostings: customCostStr,
      totalCustomNetMargin: customNetStr
    }));
  
  }

  // “Add Variety” button
  function addVarietyRow() {
    const newRow = {
      id: Date.now(),
      variety: '',
      acreCount: '1',
      yieldPerAcre: '',
      costPerAcre: '',
      harvestCostPerBox: '',
      costOfBox: '',
      boxesBonusPerYield: '',
      forecastedPrice: '0',
      revenuePerAcre: '0',
      revenuePerAcreAfterCostings: '0',
      customForecastedPrice: '',
      customRevenuePerAcre: '0',
      customRevenuePerAcreAfterCostings: '0',
      totalRevenue: '0',
      totalRevenueAfter: '0',
      totalCustomRevenue: '0',
      totalCustomRevenueAfter: '0',
    };
    setRevenueTableData((prev) => [...prev, newRow]);
  }

  // “Remove Variety” button
  function removeVarietyRow(id) {
    const updated = revenueTableData.filter((r) => r.id !== id);
    recalcTable(updated);
  }

  // Handle changes in table row fields
  function handleTableInputChange(id, field, value) {
    const updated = revenueTableData.map((row) => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    });
    recalcTable(updated);
  }

  // “Calculate All Rows” button
  async function handleCalculateAllRows() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token found');
  
      const updated = [];
      for (let row of revenueTableData) {
        if (!row.variety) {
          // Skip if variety is blank
          updated.push(row);
          continue;
        }
        const payload = {
          variety: row.variety,
          start_date: formData.startDate,
          forecast_date: formData.forecastDate,
          yield_per_acre: row.yieldPerAcre || 0,
          cost_per_acre: row.costPerAcre || 0,
          harvest_cost_per_box: row.harvestCostPerBox || 0,
          cost_of_box: row.costOfBox || 0,
          boxes_bonus_per_yield: row.boxesBonusPerYield || 0,
        };
        const resp = await axios.post('/api/calculate_forecast', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
  
        let newRow = { ...row };
        newRow.forecastedPrice = resp.data.forecasted_price.toFixed(2);
        newRow.revenuePerAcre = resp.data.revenue_per_acre.toFixed(2);
        newRow.revenuePerAcreAfterCostings =
          resp.data.revenue_per_acre_after_costings.toFixed(2);
  
        // Recompute totals (including custom columns)
        newRow = computeRowTotals(newRow);
        updated.push(newRow);
      }
  
      recalcTable(updated);
    } catch (err) {
      console.error('Error calculating rows:', err);
      alert('Failed to recalc table rows.');
    }
  }
  

  // Single yield form submission => fetch forecast for top card
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token found');
  
      // 1) Immediately fetch forecast for the single variety
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
      const resp = await axios.post('/api/calculate_forecast', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      // 2) Update the top Forecast card
      setForecastData(resp.data);
      setCustomPrice('');
      setCustomRevenue('');
      setCustomRevenueAfterCosts('');
  
      // 3) See if the table already has a row for this variety
      const existingRow = revenueTableData.find((r) => r.variety === variety);
      if (!existingRow) {
        // 3a) No existing row => create a brand-new row
        const newRow = {
          id: Date.now(),
          variety,
          acreCount: '1',
          yieldPerAcre: formData.yieldPerAcre,
          costPerAcre: formData.costPerAcre,
          harvestCostPerBox: formData.harvestCostPerBox,
          costOfBox: formData.costOfBox,
          boxesBonusPerYield: formData.boxesBonusPerYield,
  
          // use the single-forecast data
          forecastedPrice: resp.data.forecasted_price.toFixed(2),
          revenuePerAcre: resp.data.revenue_per_acre.toFixed(2),
          revenuePerAcreAfterCostings: resp.data.revenue_per_acre_after_costings.toFixed(2),
  
          // start custom columns empty
          customForecastedPrice: '',
          customRevenuePerAcre: '0',
          customRevenuePerAcreAfterCostings: '0',
  
          // totals
          totalRevenue: '0',
          totalRevenueAfter: '0',
          totalCustomRevenue: '0',
          totalCustomRevenueAfter: '0',
        };
        // Add it to the table
        const newTable = [...revenueTableData, newRow];
        recalcTable(newTable);
  
      } else {
        // 3b) If the variety row already exists => update that row’s forecast
        existingRow.yieldPerAcre = formData.yieldPerAcre;
        existingRow.costPerAcre = formData.costPerAcre;
        existingRow.harvestCostPerBox = formData.harvestCostPerBox;
        existingRow.costOfBox = formData.costOfBox;
        existingRow.boxesBonusPerYield = formData.boxesBonusPerYield;
  
        existingRow.forecastedPrice = resp.data.forecasted_price.toFixed(2);
        existingRow.revenuePerAcre = resp.data.revenue_per_acre.toFixed(2);
        existingRow.revenuePerAcreAfterCostings =
          resp.data.revenue_per_acre_after_costings.toFixed(2);
  
        // Then set state so React re-renders
        const updated = revenueTableData.map((r) => 
          (r.id === existingRow.id ? existingRow : r)
        );
        recalcTable(updated);
      }
  
      // 4) Re-calc *all* rows with the new date filters
      //    so that every variety is updated, not just the single one:
      await handleCalculateAllRows();
  
    } catch (error) {
      console.error('Error calculating forecast:', error);
      alert('Unable to calculate forecast.');
    }
  }
  
  

  return (
    <div>
      <Header isAuthenticated={user.isAuthenticated} isAdmin={user.isAdmin} isOwner={user.isOwner} />
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
            <a className="nav-link active" data-toggle="tab">Yield Calculator</a>
          </li>
        </ul>

        <div className="tab-content">
          <div className="tab-pane fade show active" id="yield-calculator">
            {/* Yield Calculator Form + Single Forecast Card */}
            <div className="row mt-4">
              <div className="col-md-6">
                <form onSubmit={handleSubmit}>
                  <div className="form-group mb-3">
                    <label>Select Variety:</label>
                    <select className="form-control"
                      value={variety}
                      onChange={handleVarietyChange}
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
                    <label>Yield per Acre (Boxes/Acre):</label>
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
                              <th>Revenue per Acre after costings</th>
                              <td>${forecastData.revenue_per_acre_after_costings}</td>
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
                  <p>No forecast available yet. Please enter data & press Calculate.</p>
                )}
              </div>
            </div>

            <hr />

            {/* Revenue Calculator Table - always visible */}
            <h2 className="mt-4 text-center">Revenue Calculator</h2>

            <div className="summary-section mb-3">
            <h4>Summary</h4>
            <p>
              The total Forecasted Revenue of your Selected Varieties is
              <strong> ${totalRevenue}</strong>, the costings are
              <strong> ${totalCostings}</strong>,
              so your net margin is
              <strong> ${totalNetMargin}</strong>.
            </p>
                  <hr/>
            {/* New line for custom totals */}
            <p>
              The total Custom Forecasted Revenue of your Selected Varieties is
              <strong> ${totalCustomRevenue}</strong>, the costings are
              <strong> ${totalCustomCostings}</strong>,
              so your net margin is
              <strong> ${totalCustomNetMargin}</strong>.
            </p>
            </div>


            <div className="mb-2">
              <button type="button" className="btn btn-sm btn-success" onClick={addVarietyRow}>
                + Add Variety
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-sm table-bordered">
                <thead>
                  <tr>
                    <th>Variety</th>
                    <th>No. of Acres</th>
                    <th>Yield/Acre</th>
                    <th>Cost/Acre</th>
                    <th>Harvest$/Box</th>
                    <th>Cost of Box</th>
                    <th>Boxes Bonus</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {revenueTableData.map((row) => (
                    <React.Fragment key={row.id}>
                      {/* Editable row */}
                      <tr>
                        <td style={{ minWidth: '100px' }}>
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
                            value={row.acreCount || ''}
                            onChange={(e) => handleTableInputChange(row.id, 'acreCount', e.target.value)}
                          />
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

                      {/* Sub-row with read-only “cards” */}
                      <tr>
                        <td colSpan="8" style={{ background: '#f8f9fa' }}>
                          <div className="d-flex flex-wrap" style={{ gap: '1rem' }}>
                            {/* Forecast Price */}
                            <div className="card p-2" style={{ minWidth: '120px', background: '#dbeafe' }}>
                              <strong>Forecast $:</strong> ${row.forecastedPrice}
                            </div>

                            {/* Revenue/Acre + After */}
                            <div className="card p-2" style={{ minWidth: '140px', background: '#ffe4e6' }}>
                              <strong>Rev/Acre:</strong> ${row.revenuePerAcre} <br />
                              <strong>After:</strong> ${row.revenuePerAcreAfterCostings}
                            </div>

                            {/* Totals for forecast * acres */}
                            <div className="card p-2" style={{ minWidth: '160px', background: '#fef9c3' }}>
                              <strong>Total Rev:</strong> ${row.totalRevenue} <br />
                              <strong>Total After:</strong> ${row.totalRevenueAfter}
                            </div>

                            {/* Custom Price + custom rev */}
                            <div className="card p-2" style={{ minWidth: '140px', background: '#dbeafe' }}>
                              <strong>Custom $:</strong>
                              <input
                                type="number"
                                className="form-control form-control-sm mt-1"
                                value={row.customForecastedPrice}
                                onChange={(e) => handleTableInputChange(row.id, 'customForecastedPrice', e.target.value)}
                              />
                            </div>

                            <div className="card p-2" style={{ minWidth: '160px', background: '#ffe4e6' }}>
                              <strong>Custom Rev/Acre:</strong> ${row.customRevenuePerAcre} <br />
                              <strong>After:</strong> ${row.customRevenuePerAcreAfterCostings}
                            </div>

                            <div className="card p-2" style={{ minWidth: '160px', background: '#fef9c3' }}>
                              <strong>Total Custom Rev:</strong> ${row.totalCustomRevenue} <br />
                              <strong>Total Custom After:</strong> ${row.totalCustomRevenueAfter}
                            </div>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Button at bottom to recalc all new varieties */}
            <button
              type="button"
              className="btn btn-info mt-2"
              onClick={handleCalculateAllRows}
            >
              Calculate Forecast for All Rows
            </button>

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
