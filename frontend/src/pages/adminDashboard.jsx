import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import Header from '../components/header';
import Footer from '../components/footer';
import { Link } from 'react-router-dom';
import '../styles/adminDashboard.css';

Chart.register(ChartDataLabels);

function AdminDashboard() {
  const [user, setUser] = useState({
    isAuthenticated: false,
    isAdmin: false,
    isOwner: false,
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          throw new Error('No token found');
        }

        const response = await axios.get('/api/current_user', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
          setUser({ isAuthenticated: false, isAdmin: false, isOwner: false });
          return;
        }

        setUser({ isAuthenticated: false, isAdmin: false, isOwner: false });
      }
    };

    fetchUser();
  }, []);

  const [variety, setVariety] = useState('Shishito');
  const [forecastData, setForecastData] = useState(null);
  const [chart, setChart] = useState(null);
  const [formData, setFormData] = useState({
    startDate: '',
    forecastDate: '',
    yieldPerAcre: '',
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const updateChart = async () => {
    if (!variety) {
      alert('Please select a variety!');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await axios.get(`/api/seasonal_prices`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: { variety },
      });

      const data = response.data;

      const canvas = document.getElementById('seasonPriceChart');
      if (!canvas) {
        console.error('Canvas element not found');
        return;
      }

      const ctx = canvas.getContext('2d');

      if (chart) {
        chart.destroy();
      }

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
            legend: {
              display: false,
              labels: {
                color: 'black',
              },
            },
            datalabels: {
              color: 'black',
              anchor: 'end',
              align: 'top',
              formatter: (value) => `$${value}`,
            },
          },
          scales: {
            x: {
              ticks: {
                color: 'black',
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.2)',
              },
            },
            y: {
              ticks: {
                color: 'black',
              },
              title: {
                display: true,
                text: 'Price ($)',
                color: 'black',
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.2)',
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
        return;
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No token found');

      const response = await axios.post(
        '/api/calculate_forecast',
        {
          variety,
          start_date: formData.startDate,
          forecast_date: formData.forecastDate,
          yield_per_acre: formData.yieldPerAcre,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setForecastData(response.data);
    } catch (error) {
      console.error('Error calculating forecast:', error.response?.data || error.message);
      alert(`Error: ${error.response?.data?.error || 'Unable to calculate forecast.'}`);
    }
  };

  useEffect(() => {
    updateChart();
  }, [variety]);

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

        {/* Tabs Navigation */}
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <a className="nav-link active" data-toggle="tab" href="#yield-calculator">
              Yield Calculator
            </a>
          </li>
        </ul>

        {/* Yield Calculator Tab */}
        <div className="tab-content">
          <div className="tab-pane fade show active" id="yield-calculator">
            <div className="row mt-4">
              {/* Filters Section */}
              <div className="col-md-6">
                <form onSubmit={handleSubmit}>
                  <div className="form-group mb-3">
                    <label htmlFor="variety">Select Variety:</label>
                    <select id="variety" className="form-control" value={variety} onChange={(e) => setVariety(e.target.value)}>
                      <option value="Shishito">Shishito</option>
                      <option value="Anaheim">Anaheim</option>
                      <option value="Cubanelles">Cubanelles</option>
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
                    <label htmlFor="start_date">Enter Start Date:</label>
                    <input
                      type="date"
                      id="start_date"
                      name="startDate"
                      className="form-control"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group mb-3">
                    <label htmlFor="forecast_date">Enter Forecast Date:</label>
                    <input
                      type="date"
                      id="forecast_date"
                      name="forecastDate"
                      className="form-control"
                      value={formData.forecastDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group mb-3">
                    <label htmlFor="yield_per_acre">Enter Yield per Acre (Boxes per Acre):</label>
                    <input
                      type="number"
                      id="yield_per_acre"
                      name="yieldPerAcre"
                      className="form-control"
                      value={formData.yieldPerAcre}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Calculate
                  </button>
                </form>
              </div>

              {/* Results Section */}
              <div className="col-md-6">
                {forecastData ? (
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
                            <th>Season for Forecast Date</th>
                            <td>{forecastData.season}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
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
