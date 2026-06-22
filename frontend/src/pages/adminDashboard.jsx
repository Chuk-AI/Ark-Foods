import React, { useState, useEffect } from "react";
import axios from "axios";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Link } from "react-router-dom";
import "../styles/adminDashboard.css";

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
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("No token found");
        const response = await axios.get("/api/current_user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData = response.data;
        setUser({
          isAuthenticated: true,
          isAdmin: userData.role === "admin",
          isOwner: userData.role === "owner",
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
        if (error.response && error.response.status === 401) {
          alert("Session expired. Please log in again.");
          localStorage.removeItem("authToken");
        }
        setUser({ isAuthenticated: false, isAdmin: false, isOwner: false });
      }
    }
    fetchUser();
  }, []);

  // Commodity selection + single forecast data
  const [variety, setVariety] = useState("Shishito");
  const [forecastData, setForecastData] = useState(null);

  // Main yield form
  const [formData, setFormData] = useState({
    startDate: "",
    forecastDate: "",
    yieldPerAcre: "",
    costPerAcre: "",
    harvestCostPerBox: "",
    costOfBox: "",
    boxesBonusPerYield: "",
  });

  // Single “Custom Price” logic for the top forecast card
  const [customPrice, setCustomPrice] = useState("");
  const [customRevenue, setCustomRevenue] = useState("");
  const [customRevenueAfterCosts, setCustomRevenueAfterCosts] = useState("");

  // The table data for the “Revenue Calculator”
  const [revenueTableData, setRevenueTableData] = useState(() => {
    try {
      const saved = localStorage.getItem("myRevenueTable");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Totals for summary
  const [totalRevenue, setTotalRevenue] = useState("0");
  const [totalCostings, setTotalCostings] = useState("0");
  const [totalNetMargin, setTotalNetMargin] = useState("0");

  // Custom totals for summary
  const [totalCustomRevenue, setTotalCustomRevenue] = useState("0");
  const [totalCustomCostings, setTotalCustomCostings] = useState("0");
  const [totalCustomNetMargin, setTotalCustomNetMargin] = useState("0");

  // for the commodity average table
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [source, setSource] = useState("both");
  const [city, setCity] = useState("All cities");
  const [priceData, setPriceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [forecastCity, setForecastCity] = useState("All cities");

  // Chart instance
  const [chart, setChart] = useState(null);

  // --- 1) Load from localStorage on mount
  useEffect(() => {
    // In load useEffect
    const savedTable = localStorage.getItem("myRevenueTable");
    if (savedTable) {
      try {
        setRevenueTableData(JSON.parse(savedTable));
      } catch (e) {
        console.error("Invalid saved table data", e);
      }
    }

    const savedForm = localStorage.getItem("myYieldForm");
    if (savedForm) {
      const parsed = JSON.parse(savedForm);
      setVariety(parsed.variety || "Shishito");
      setForecastCity(parsed.forecastCity || "All cities"); // Add this line
      setFormData((prev) => ({ ...prev, ...parsed }));
    }

    const savedSummary = localStorage.getItem("mySummary");
    if (savedSummary) {
      try {
        const parsedSummary = JSON.parse(savedSummary);
        setTotalRevenue(parsedSummary.totalRevenue || "0");
        setTotalCostings(parsedSummary.totalCostings || "0");
        setTotalNetMargin(parsedSummary.totalNetMargin || "0");

        // Also restore the custom totals:
        setTotalCustomRevenue(parsedSummary.totalCustomRevenue || "0");
        setTotalCustomCostings(parsedSummary.totalCustomCostings || "0");
        setTotalCustomNetMargin(parsedSummary.totalCustomNetMargin || "0");
      } catch (e) {
        console.error("Invalid summary data in localStorage", e);
      }
    }
  }, []);

  // Update the useEffect that saves to localStorage
  useEffect(() => {
    const toSave = { ...formData, variety, forecastCity }; // Add forecastCity
    localStorage.setItem("myYieldForm", JSON.stringify(toSave));
  }, [formData, variety, forecastCity]); // Add forecastCity to dependencies

  // --- 2) Whenever table changes, save to localStorage
  useEffect(() => {
    localStorage.setItem("myRevenueTable", JSON.stringify(revenueTableData));
  }, [revenueTableData]);

  // Also save form changes
  useEffect(() => {
    const toSave = { ...formData, variety };
    localStorage.setItem("myYieldForm", JSON.stringify(toSave));
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
    const hc = parseFloat(formData.harvestCostPerBox) || 0;
    const cob = parseFloat(formData.costOfBox) || 0;
    const bb = parseFloat(formData.boxesBonusPerYield) || 0;

    const rev = val * ypa;
    const totalC = cpa + hc * ypa + cob * ypa + bb;
    const revAfter = rev - totalC;

    setCustomRevenue(rev.toFixed(2));
    setCustomRevenueAfterCosts(revAfter.toFixed(2));
  }

  // Chart
  async function updateChart(
    selectedVariety,
    selectedCity,
    startDate,
    forecastDate,
  ) {
    if (!variety) return;
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No token found");
      const response = await axios.get("/api/seasonal_prices", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          variety: selectedVariety,
          city: selectedCity,
          start_date: startDate,
          forecast_date: forecastDate,
        },
      });
      const data = response.data;
      const canvas = document.getElementById("seasonPriceChart");
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (chart) chart.destroy();

      const newChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Spring", "Summer", "Autumn", "Winter"],
          datasets: [
            {
              label: `Forecasted Price for ${variety}`,
              data: [data.Spring, data.Summer, data.Autumn, data.Winter],
              backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
              borderColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
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
              color: "black",
              anchor: "end",
              align: "top",
              formatter: (value) => `$${value}`,
            },
          },
          scales: {
            x: { ticks: { color: "black" } },
            y: {
              ticks: { color: "black" },
              title: { display: true, text: "Price ($)", color: "black" },
            },
          },
        },
      });
      setChart(newChart);
    } catch (error) {
      console.error("Error fetching chart data:", error);
    }
  }

  // useEffect(() => {
  //   updateChart();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [variety]);

  async function updateChart(
    selectedVariety,
    selectedCity,
    startDate,
    forecastDate,
  ) {
    if (!selectedVariety) return;
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No token found");

      const response = await axios.get("/api/seasonal_prices", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          variety: selectedVariety,
          city: selectedCity,
          start_date: startDate,
          forecast_date: forecastDate,
        },
      });

      const data = response.data;
      const canvas = document.getElementById("seasonPriceChart");
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (chart) chart.destroy();

      const newChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Spring", "Summer", "Autumn", "Winter"],
          datasets: [
            {
              label: `Forecasted Price for ${selectedVariety} - ${selectedCity}`,
              data: [data.Spring, data.Summer, data.Autumn, data.Winter],
              backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
              borderColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"],
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
              color: "black",
              anchor: "end",
              align: "top",
              formatter: (value) => `$${value}`,
            },
          },
          scales: {
            x: { ticks: { color: "black" } },
            y: {
              ticks: { color: "black" },
              title: { display: true, text: "Price ($)", color: "black" },
            },
          },
        },
      });
      setChart(newChart);
    } catch (error) {
      console.error("Error fetching chart data:", error);
    }
  }

  // Helper to recalc a single row’s derived fields
  function computeRowTotals(row) {
    const ypa = parseFloat(row.yieldPerAcre) || 0;
    const cpa = parseFloat(row.costPerAcre) || 0;
    const hc = parseFloat(row.harvestCostPerBox) || 0;
    const cob = parseFloat(row.costOfBox) || 0;
    const bb = parseFloat(row.boxesBonusPerYield) || 0;
    const acreCount = parseFloat(row.acreCount) || 0;

    // 1) Forecast columns
    const forecastPrice = parseFloat(row.forecastedPrice) || 0;
    const revenueAcre = forecastPrice * ypa;
    const totalCosts = cpa + hc * ypa + cob * ypa + bb;
    const revenueAcreAfter = revenueAcre - totalCosts;

    row.revenuePerAcre = revenueAcre.toFixed(2);
    row.revenuePerAcreAfterCostings = revenueAcreAfter.toFixed(2);

    const totalRev = revenueAcre * acreCount;
    const totalRevAfter = revenueAcreAfter * acreCount;
    row.totalRevenue = totalRev.toFixed(2);
    row.totalRevenueAfter = totalRevAfter.toFixed(2);

    // 2) Custom columns
    if (!row.customForecastedPrice || row.customForecastedPrice.trim() === "") {
      // If blank, skip or show zero/blank in custom columns
      row.customRevenuePerAcre = "";
      row.customRevenuePerAcreAfterCostings = "";
      row.totalCustomRevenue = "";
      row.totalCustomRevenueAfter = "";
    } else {
      // If the user actually typed something:
      const customPriceNum = parseFloat(row.customForecastedPrice) || 0;

      const customRevAcre = customPriceNum * ypa;
      const customRevAcreAfter = customRevAcre - totalCosts;

      row.customRevenuePerAcre = customRevAcre.toFixed(2);
      row.customRevenuePerAcreAfterCostings = customRevAcreAfter.toFixed(2);

      const totCustomRev = customRevAcre * acreCount;
      const totCustomRevAfter = customRevAcreAfter * acreCount;

      row.totalCustomRevenue = totCustomRev.toFixed(2);
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
      sumCustomNet += parseFloat(row.totalCustomRevenueAfter) || 0;
    });

    let cost = sumRevenue - sumNet;

    let costCustom = sumCustomRevenue - sumCustomNet;

    const revenueStr = sumRevenue.toFixed(2);
    const costStr = cost.toFixed(2);
    const netStr = sumNet.toFixed(2);

    const customRevStr = sumCustomRevenue.toFixed(2);
    const customCostStr = costCustom.toFixed(2);
    const customNetStr = sumCustomNet.toFixed(2);

    setTotalRevenue(revenueStr);
    setTotalCostings(costStr);
    setTotalNetMargin(netStr);

    setTotalCustomRevenue(customRevStr);
    setTotalCustomCostings(customCostStr);
    setTotalCustomNetMargin(customNetStr);

    setRevenueTableData(newTable);

    localStorage.setItem(
      "mySummary",
      JSON.stringify({
        totalRevenue: revenueStr,
        totalCostings: costStr,
        totalNetMargin: netStr,
        totalCustomRevenue: customRevStr,
        totalCustomCostings: customCostStr,
        totalCustomNetMargin: customNetStr,
      }),
    );
  }

  // “Add Variety” button
  function addVarietyRow() {
    const newRow = {
      id: Date.now(),
      variety: "",
      acreCount: "1",
      yieldPerAcre: "",
      costPerAcre: "",
      harvestCostPerBox: "",
      costOfBox: "",
      boxesBonusPerYield: "",
      forecastedPrice: "0",
      revenuePerAcre: "0",
      revenuePerAcreAfterCostings: "0",
      customForecastedPrice: "",
      customRevenuePerAcre: "0",
      customRevenuePerAcreAfterCostings: "0",
      totalRevenue: "0",
      totalRevenueAfter: "0",
      totalCustomRevenue: "0",
      totalCustomRevenueAfter: "0",
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
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No token found");

      const updated = [];
      for (let row of revenueTableData) {
        if (!row.variety) {
          // Skip if variety is blank
          updated.push(row);
          continue;
        }
        const payload = {
          variety: row.variety,
          city: forecastCity, // Add this line

          start_date: formData.startDate,
          forecast_date: formData.forecastDate,
          yield_per_acre: row.yieldPerAcre || 0,
          cost_per_acre: row.costPerAcre || 0,
          harvest_cost_per_box: row.harvestCostPerBox || 0,
          cost_of_box: row.costOfBox || 0,
          boxes_bonus_per_yield: row.boxesBonusPerYield || 0,
        };
        const resp = await axios.post("/api/calculate_forecast", payload, {
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
      console.error("Error calculating rows:", err);
      alert("Failed to recalc table rows.");
    }
  }

  // Single yield form submission => fetch forecast for top card
  // Single yield form submission => fetch forecast for top card
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No token found");

      // 1) Immediately fetch forecast for the single variety
      const payload = {
        variety,
        city: forecastCity, // Use the city filter
        start_date: formData.startDate,
        forecast_date: formData.forecastDate,
        yield_per_acre: formData.yieldPerAcre,
        cost_per_acre: formData.costPerAcre,
        harvest_cost_per_box: formData.harvestCostPerBox,
        cost_of_box: formData.costOfBox,
        boxes_bonus_per_yield: formData.boxesBonusPerYield,
      };
      const resp = await axios.post("/api/calculate_forecast", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 2) Update the top Forecast card
      setForecastData(resp.data);
      setCustomPrice("");
      setCustomRevenue("");
      setCustomRevenueAfterCosts("");

      // 3) Update the seasonal chart with current filters
      await updateChart(
        variety,
        forecastCity,
        formData.startDate,
        formData.forecastDate,
      );

      // 4) See if the table already has a row for this variety
      const existingRow = revenueTableData.find((r) => r.variety === variety);
      if (!existingRow) {
        // 4a) No existing row => create a brand-new row
        const newRow = {
          id: Date.now(),
          variety,
          acreCount: "1",
          yieldPerAcre: formData.yieldPerAcre,
          costPerAcre: formData.costPerAcre,
          harvestCostPerBox: formData.harvestCostPerBox,
          costOfBox: formData.costOfBox,
          boxesBonusPerYield: formData.boxesBonusPerYield,

          // use the single-forecast data
          forecastedPrice: resp.data.forecasted_price.toFixed(2),
          revenuePerAcre: resp.data.revenue_per_acre.toFixed(2),
          revenuePerAcreAfterCostings:
            resp.data.revenue_per_acre_after_costings.toFixed(2),

          // start custom columns empty
          customForecastedPrice: "",
          customRevenuePerAcre: "0",
          customRevenuePerAcreAfterCostings: "0",

          // totals
          totalRevenue: "0",
          totalRevenueAfter: "0",
          totalCustomRevenue: "0",
          totalCustomRevenueAfter: "0",
        };
        // Add it to the table
        const newTable = [...revenueTableData, newRow];
        recalcTable(newTable);
      } else {
        // 4b) If the variety row already exists => update that row's forecast
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
          r.id === existingRow.id ? existingRow : r,
        );
        recalcTable(updated);
      }

      // 5) Re-calc *all* rows with the new date filters
      //    so that every variety is updated, not just the single one:
      await handleCalculateAllRows();
    } catch (error) {
      console.error("Error calculating forecast:", error);
      alert("Unable to calculate forecast.");
    }
  }

  const handleGenerate = async () => {
    // Validate dates before sending
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get("/api/price_averages", {
        params: {
          start_date: startDate,
          end_date: endDate,
          source: source,
          city: city,
        },
      });

      setPriceData(response.data.price_averages);
    } catch (error) {
      console.error(
        "Error fetching price averages:",
        error.response ? error.response.data : error,
      );
      setError(error.response?.data?.error || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="container adminDash-section">
        <div className="mt-3 mb-3">
          <Link to="/approve_users" className="btn btn-primary">
            Approve Users
          </Link>
        </div>
        <h1 className="mt-4">Admin Dashboard</h1>
        <p>Welcome, Admin! You have Admin privileges.</p>

        {/* ── Forecast Cache Management — always visible at top ── */}
        <CacheManager />

        <ul className="nav nav-tabs" style={{ marginTop: 32 }}>
          <li className="nav-item">
            <a className="nav-link active" data-toggle="tab">
              Yield Calculator
            </a>
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
                    <select
                      className="form-control"
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
                  {/* Add this after the variety dropdown */}
                  <div className="form-group mb-3">
                    <label>Select City:</label>
                    <select
                      className="form-control"
                      value={forecastCity}
                      onChange={(e) => setForecastCity(e.target.value)}
                    >
                      <option value="All cities">All Cities</option>
                      <option value="Baltimore">Baltimore</option>
                      <option value="Boston">Boston</option>
                      <option value="Chicago">Chicago</option>
                      <option value="Columbia">Columbia</option>
                      <option value="Los Angeles">Los Angeles</option>
                      <option value="Miami">Miami</option>
                      <option value="New York">New York</option>
                      <option value="Philadelphia">Philadelphia</option>
                      <option value="Detroit">Detroit</option>
                      <option value="Atlanta">Atlanta</option>
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
                              <td>
                                ${forecastData.revenue_per_acre_after_costings}
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
                                {customRevenue ? `$${customRevenue}` : ""}
                              </td>
                            </tr>
                            <tr>
                              <th>Revenue per Acre after costings</th>
                              <td>
                                {customRevenueAfterCosts
                                  ? `$${customRevenueAfterCosts}`
                                  : ""}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <p>
                    No forecast available yet. Please enter data & press
                    Calculate.
                  </p>
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
                <strong> ${totalCostings}</strong>, so your net margin is
                <strong> ${totalNetMargin}</strong>.
              </p>
              <hr />
              {/* New line for custom totals */}
              <p>
                The total Custom Forecasted Revenue of your Selected Varieties
                is
                <strong> ${totalCustomRevenue}</strong>, the costings are
                <strong> ${totalCustomCostings}</strong>, so your net margin is
                <strong> ${totalCustomNetMargin}</strong>.
              </p>
            </div>

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
                        <td style={{ minWidth: "100px" }}>
                          <select
                            className="form-control form-control-sm"
                            value={row.variety}
                            onChange={(e) =>
                              handleTableInputChange(
                                row.id,
                                "variety",
                                e.target.value,
                              )
                            }
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
                            value={row.acreCount || ""}
                            onChange={(e) =>
                              handleTableInputChange(
                                row.id,
                                "acreCount",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={row.yieldPerAcre}
                            onChange={(e) =>
                              handleTableInputChange(
                                row.id,
                                "yieldPerAcre",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={row.costPerAcre}
                            onChange={(e) =>
                              handleTableInputChange(
                                row.id,
                                "costPerAcre",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={row.harvestCostPerBox}
                            onChange={(e) =>
                              handleTableInputChange(
                                row.id,
                                "harvestCostPerBox",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={row.costOfBox}
                            onChange={(e) =>
                              handleTableInputChange(
                                row.id,
                                "costOfBox",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={row.boxesBonusPerYield}
                            onChange={(e) =>
                              handleTableInputChange(
                                row.id,
                                "boxesBonusPerYield",
                                e.target.value,
                              )
                            }
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
                        <td colSpan="8" style={{ background: "#f8f9fa" }}>
                          <div
                            className="d-flex flex-wrap"
                            style={{ gap: "1rem" }}
                          >
                            {/* Forecast Price */}
                            <div
                              className="card p-2"
                              style={{
                                minWidth: "120px",
                                background: "#dbeafe",
                              }}
                            >
                              <strong>Forecast $:</strong> $
                              {row.forecastedPrice}
                            </div>

                            {/* Revenue/Acre + After */}
                            <div
                              className="card p-2"
                              style={{
                                minWidth: "140px",
                                background: "#ffe4e6",
                              }}
                            >
                              <strong>Rev/Acre:</strong> ${row.revenuePerAcre}{" "}
                              <br />
                              <strong>After:</strong> $
                              {row.revenuePerAcreAfterCostings}
                            </div>

                            {/* Totals for forecast * acres */}
                            <div
                              className="card p-2"
                              style={{
                                minWidth: "160px",
                                background: "#fef9c3",
                              }}
                            >
                              <strong>Total Rev:</strong> ${row.totalRevenue}{" "}
                              <br />
                              <strong>Total After:</strong> $
                              {row.totalRevenueAfter}
                            </div>

                            {/* Custom Price + custom rev */}
                            <div
                              className="card p-2"
                              style={{
                                minWidth: "140px",
                                background: "#dbeafe",
                              }}
                            >
                              <strong>Custom $:</strong>
                              <input
                                type="number"
                                className="form-control form-control-sm mt-1"
                                value={row.customForecastedPrice}
                                onChange={(e) =>
                                  handleTableInputChange(
                                    row.id,
                                    "customForecastedPrice",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>

                            <div
                              className="card p-2"
                              style={{
                                minWidth: "160px",
                                background: "#ffe4e6",
                              }}
                            >
                              <strong>Custom Rev/Acre:</strong> $
                              {row.customRevenuePerAcre} <br />
                              <strong>After:</strong> $
                              {row.customRevenuePerAcreAfterCostings}
                            </div>

                            <div
                              className="card p-2"
                              style={{
                                minWidth: "160px",
                                background: "#fef9c3",
                              }}
                            >
                              <strong>Total Custom Rev:</strong> $
                              {row.totalCustomRevenue} <br />
                              <strong>Total Custom After:</strong> $
                              {row.totalCustomRevenueAfter}
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

            {/* Commodity average prices generating table */}
            <div className="commodity-prices-section">
              <h2 className="text-center mt-4">Commodity Price Averages</h2>

              {/* 🔹 Filters Section */}
              <div className="filters-container">
                <div className="filter-group">
                  <label>Start Date:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="form-control"
                  />
                </div>

                <div className="filter-group">
                  <label>End Date:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="form-control"
                  />
                </div>

                <div className="filter-group">
                  <label>Source:</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="form-control"
                  >
                    <option value="both">Both</option>
                    <option value="USDA">USDA</option>
                    <option value="ProduceIQ">ProduceIQ</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>City:</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="form-control"
                  >
                    <option value="All cities">All Cities</option>
                    <option value="Baltimore">Baltimore</option>
                    <option value="Boston">Boston</option>
                    <option value="Chicago">Chicago</option>
                    <option value="Columbia">Columbia</option>
                    <option value="Los Angeles">Los Angeles</option>
                    <option value="Miami">Miami</option>
                    <option value="New York">New York</option>
                    <option value="Philadelphia">Philadelphia</option>
                    <option value="Detroit">Detroit</option>
                    <option value="Atlanta">Atlanta</option>
                  </select>
                </div>

                <div className="filter-group">
                  <button
                    className="btn btn-primary generate-btn"
                    onClick={handleGenerate}
                    disabled={loading}
                  >
                    {loading ? "Generating..." : "Generate"}
                  </button>
                </div>
              </div>

              {/* 🔹 Error Message */}
              {error && <div className="error-message">{error}</div>}

              {/* 🔹 Commodity Prices Table */}
              <div className="table-responsive">
                <table className="table table-bordered table-hover mt-3">
                  <thead className="thead-dark">
                    <tr>
                      <th>Commodity</th>
                      <th>Source</th>
                      <th>Unit</th>
                      <th>Average Price ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceData.length > 0 ? (
                      priceData.map((item, index) => (
                        <tr key={index}>
                          <td>{item.commodity}</td>
                          <td>{item.source}</td>
                          <td>{item.unit || '—'}</td>
                          <td>${item.avg_price.toFixed(2)}</td>
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
    </div>
  );
}

function CacheManager() {
  const [status, setStatus] = useState(null);
  const [polling, setPolling] = useState(false);
  const [diag, setDiag] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const token = () => localStorage.getItem("authToken");

  const fetchStatus = async () => {
    try {
      const r = await axios.get("/api/cache_build_status", { headers: { Authorization: `Bearer ${token()}` } });
      setStatus(r.data);
      return r.data;
    } catch { return null; }
  };

  const runTest = async (commodity = "Jalapeno") => {
    setTestLoading(true);
    try {
      const r = await axios.get(`/api/test_single_forecast?commodity=${commodity}&city=All+cities`, { headers: { Authorization: `Bearer ${token()}` } });
      setTestResult(r.data);
    } catch (e) {
      setTestResult({ error: e.message });
    } finally {
      setTestLoading(false);
    }
  };

  const fetchDiag = async () => {
    setDiagLoading(true);
    try {
      const r = await axios.get("/api/forecast_diagnostics", { headers: { Authorization: `Bearer ${token()}` } });
      setDiag(r.data);
    } catch (e) {
      setDiag({ error: e.message });
    } finally {
      setDiagLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); fetchDiag(); }, []);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      const s = await fetchStatus();
      if (s && !s.running) {
        setPolling(false);
        clearInterval(interval);
        fetchDiag(); // refresh diagnostics after build finishes
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [polling]);

  const handleTrigger = async () => {
    try {
      await axios.post("/api/trigger_cache_build", {}, { headers: { Authorization: `Bearer ${token()}` } });
      setPolling(true);
      fetchStatus();
    } catch (e) {
      alert(e.response?.data?.message || "Failed to start build");
    }
  };

  const prog = status?.progress;
  const pct = prog?.total > 0 ? Math.round((prog.current / prog.total) * 100) : 0;
  const isRunning = status?.running;
  const cacheUpdated = status?.cache_last_updated?.["price_forecast_all_combined_all_cities"];
  const cacheSummary = diag?.cache_summary?.["price_forecast_all_combined_all_cities"];

  return (
    <div className="row mt-4">
      <div className="col-md-12">
        <div style={{ border: "1px solid var(--border, #e2e8f0)", borderRadius: 10, background: "var(--surface, #fff)", padding: "24px 28px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Forecast Cache Manager</h2>
              <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>
                The Forecasts dashboard requires pre-computed data. Click <strong>Build Now</strong> to run the forecast algorithm for all cities. This typically takes <strong>5–15 minutes</strong>.
              </p>
            </div>
            <button onClick={handleTrigger} disabled={isRunning}
              style={{ padding: "9px 22px", background: isRunning ? "#94a3b8" : "#0d9488", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: isRunning ? "not-allowed" : "pointer", whiteSpace: "nowrap", marginLeft: 20 }}>
              {isRunning ? "Building…" : "Build Now"}
            </button>
          </div>

          {/* Progress bar */}
          {isRunning && prog && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                <span>Building city: <strong>{prog.city || "starting…"}</strong></span>
                <span>{prog.current}/{prog.total} ({pct}%)</span>
              </div>
              <div style={{ background: "#e2e8f0", borderRadius: 999, height: 8, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, background: "#0d9488", height: "100%", borderRadius: 999, transition: "width 0.4s ease" }} />
              </div>
            </div>
          )}

          {/* Status tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 8 }}>
            {[
              { label: "Status", value: isRunning ? "🟡 Running" : status?.error ? "🔴 Failed" : status?.finished ? "🟢 Complete" : "⚪ Idle" },
              { label: "Cache last built", value: cacheUpdated ? new Date(cacheUpdated).toLocaleString() : "Never" },
              { label: "Started", value: status?.started ? new Date(status.started).toLocaleString() : "—" },
              { label: "Finished", value: status?.finished ? new Date(status.finished).toLocaleString() : "—" },
              { label: "Forecasts OK / Total", value: cacheSummary ? `${cacheSummary.ok_items} / ${cacheSummary.total_items}` : "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#f8fafc", borderRadius: 7, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Build error */}
          {status?.error && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, fontSize: 12, color: "#dc2626", fontFamily: "monospace" }}>
              Build error: {status.error}
            </div>
          )}

          {/* Cache failures */}
          {cacheSummary?.failures?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", marginBottom: 6 }}>
                ⚠ {cacheSummary.failed_items} commodity forecast(s) failed:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {cacheSummary.failures.map((f, i) => (
                  <div key={i} style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>
                    <strong>{f.commodity}</strong>: {f.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data freshness table */}
          {diag?.data_freshness && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Price Data Freshness</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      {["Commodity", "Latest Data", "Age (days)", "Source", "City", "Status"].map(h => (
                        <th key={h} style={{ padding: "6px 12px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {diag.data_freshness.map((row, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "6px 12px", fontWeight: 600 }}>{row.commodity}</td>
                        <td style={{ padding: "6px 12px", fontFamily: "monospace" }}>{row.latest_date || "No data"}</td>
                        <td style={{ padding: "6px 12px", fontFamily: "monospace", color: row.age_days > 14 ? "#dc2626" : row.age_days > 7 ? "#d97706" : "#16a34a" }}>
                          {row.age_days != null ? row.age_days : "—"}
                        </td>
                        <td style={{ padding: "6px 12px" }}>{row.source || "—"}</td>
                        <td style={{ padding: "6px 12px" }}>{row.city || "—"}</td>
                        <td style={{ padding: "6px 12px" }}>
                          <span style={{ background: row.ok ? "#dcfce7" : "#fee2e2", color: row.ok ? "#16a34a" : "#dc2626", padding: "2px 8px", borderRadius: 999, fontWeight: 600, fontSize: 11 }}>
                            {row.ok ? "OK" : "STALE"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!diag.all_data_ok && (
                <div style={{ marginTop: 10, padding: "10px 14px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 7, fontSize: 12, color: "#92400e" }}>
                  ⚠ Some commodities have stale or missing price data (&gt;30 days old). The daily data fetch scheduler may not be running. Run <code>fetch_daily_data()</code> manually or check the scheduler.
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 14, fontSize: 12, color: "#94a3b8", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => { fetchStatus(); fetchDiag(); }} style={{ background: "none", border: "none", color: "#0d9488", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>↻ Refresh</button>
            <button onClick={() => runTest("Jalapeno")} disabled={testLoading}
              style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: testLoading ? "not-allowed" : "pointer", opacity: testLoading ? 0.7 : 1 }}>
              {testLoading ? "Running…" : "🔬 Run Diagnostic Test"}
            </button>
            <span>Builds cache for All Cities + 10 individual cities · forecasts use last 30 days of price data</span>
          </div>

          {/* Test result */}
          {testResult && (
            <div style={{ marginTop: 14, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                🔬 Diagnostic: {testResult.input?.commodity} / {testResult.input?.city}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                {[
                  ["Current year / day", `${testResult.current_year} / day ${testResult.current_day}`],
                  ["30-day window start", `day ${testResult.min_day_for_30d}`],
                  ["current_price result", testResult.current_price_result != null ? `$${testResult.current_price_result}` : "NULL ⚠"],
                  ["PIQ/USDA rows (this year, 30d)", testResult.daily_count_piq_usda_this_year_30d],
                  ["All-source rows (last 2yr)", testResult.daily_count_all_sources_last_2yr],
                  ["Forecast success", testResult.forecast_result?.success === false ? `❌ ${testResult.forecast_result?.error}` : "✅"],
                ].map(([k, v]) => (
                  <div key={k} style={{ fontSize: 11 }}>
                    <span style={{ color: "#64748b", fontWeight: 600 }}>{k}: </span>
                    <span style={{ fontFamily: "monospace", color: "#0f172a" }}>{String(v)}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Latest 5 rows (any source):</div>
              <pre style={{ fontSize: 10, background: "#0f172a", color: "#e2e8f0", borderRadius: 6, padding: "8px 12px", overflowX: "auto", margin: 0 }}>
                {JSON.stringify(testResult.latest_5_rows_any_source, null, 2)}
              </pre>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", margin: "8px 0 4px" }}>Latest 5 rows (ProduceIQ/USDA only):</div>
              <pre style={{ fontSize: 10, background: "#0f172a", color: "#e2e8f0", borderRadius: 6, padding: "8px 12px", overflowX: "auto", margin: 0 }}>
                {JSON.stringify(testResult.latest_5_rows_piq_usda_only, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
