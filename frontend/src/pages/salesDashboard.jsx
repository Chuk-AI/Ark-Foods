import React from "react";
import Chart from "chart.js/auto";
import "chartjs-plugin-datalabels";
import "chartjs-adapter-luxon";
import { DateTime } from "luxon";
import { useEffect, useState, useRef } from "react";
import "../styles/sales_styles.css";
import * as XLSX from "xlsx";

// Hex equivalents for oklch design tokens (canvas doesn't support oklch)
const CHART_COLORS = [
  "#0d9488", // teal
  "#6366f1", // indigo
  "#f97316", // orange
  "#22c55e", // green
  "#f43f5e", // rose
  "#eab308", // amber
];
const SEASONAL_COLORS = ["#0d9488", "#6366f1", "#f97316", "#22c55e"];

const CHART_TOOLTIP = {
  backgroundColor: "#ffffff",
  titleColor: "#0f172a",
  bodyColor: "#475569",
  borderColor: "#e2e8f0",
  borderWidth: 1,
  padding: 10,
  cornerRadius: 6,
};
const CHART_GRID = { color: "rgba(0,0,0,0.04)" };
const CHART_TICKS = { font: { family: "'Inter', sans-serif", size: 11 }, color: "#64748b" };

const FilterToggle = ({ show, onToggle }) => (
  <div className="filter-bar">
    <button className="filter-toggle-btn" onClick={onToggle}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
      </svg>
      Filters {show ? "▲" : "▼"}
    </button>
  </div>
);

const COMMODITIES = ["Anaheim","Cubanelles","Fresno","Habanero","Hungarian Wax","Jalapeno","Long Hot","Poblano","Serrano","Shishito"];
const CITIES = ["New York","Chicago","Los Angeles","Miami","Philadelphia","Boston","Baltimore","Columbia","Detroit","Atlanta"];
const REGIONS = ["Central and South Florida","South Georgia","Mexico Crossings Through Texas","Mexico Crossings Through Nogales Arizona","Virginia"];

function SalesDashboard() {
  const [source, setSource] = useState("Both");
  const [prices, setPrices] = useState({});

  // Best sell market
  const [bestMarketData, setBestMarketData] = useState([]);
  const [filterState, setFilterState] = useState({ commodity: "Anaheim", source: "USDA", last7Days: false });
  const [appliedFilters, setAppliedFilters] = useState({ commodity: "Anaheim", source: "USDA", last7Days: false });

  // Market opportunity
  const [marketOpportunityData, setMarketOpportunityData] = useState([]);
  const [opportunitySource, setOpportunitySource] = useState("USDA");

  // Historical
  const [historicalChart, setHistoricalChart] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [historicalFilterState, setHistoricalFilterState] = useState({
    commodities: ["Anaheim"], cities: ["New York"], source: "USDA",
    startDate: "2024-10-01", endDate: new Date().toISOString().split("T")[0],
    averageCommodities: false, averageCities: false,
  });
  const [appliedHistoricalFilters, setAppliedHistoricalFilters] = useState({
    commodities: ["Anaheim"], cities: ["New York"], source: "USDA",
    startDate: "2024-11-01", endDate: new Date().toISOString().split("T")[0],
    averageCommodities: false, averageCities: false,
  });

  // Seasonal
  const [seasonalFilterState, setSeasonalFilterState] = useState({
    commodities: ["Anaheim"], cities: ["New York"], source: "ProduceIQ",
    startDate: "2023-01-01", endDate: new Date().toISOString().split("T")[0],
  });
  const [appliedSeasonalFilters, setAppliedSeasonalFilters] = useState({
    commodities: ["Anaheim"], cities: ["New York"], source: "ProduceIQ",
    startDate: "2023-01-01", endDate: new Date().toISOString().split("T")[0],
  });

  // Shipping
  const [shippingPointPriceChart, setShippingPointPriceChart] = useState(null);
  const [shippingPointPriceChartData, setShippingPointPriceChartData] = useState(null);
  const [shippingPointFilterState, setShippingPointFilterState] = useState({
    commodities: ["Habanero"], regions: ["mexico crossings through texas"],
    source: "ProduceIQ", startDate: "2024-11-01", endDate: new Date().toISOString().split("T")[0],
    averageCommodities: false, averageRegions: false,
  });
  const [appliedShippingPointFilters, setAppliedShippingPointFilters] = useState({
    commodities: ["Anaheim"], regions: ["Central and South Florida"],
    source: "ProduceIQ", startDate: "2024-11-01", endDate: new Date().toISOString().split("T")[0],
    averageCommodities: false, averageRegions: false,
  });

  // Filter visibility
  const [showMostRecentFilters, setShowMostRecentFilters] = useState(false);
  const [showBestSellFilters, setShowBestSellFilters] = useState(false);
  const [showSeasonalFilters, setShowSeasonalFilters] = useState(false);
  const [showHistoricalFilters, setShowHistoricalFilters] = useState(false);
  const [showShippingFilters, setShowShippingFilters] = useState(false);

  // Chart refs
  const bestSellChartRef = useRef(null);
  const seasonalChartRef = useRef(null);
  const historicalChartRef = useRef(null);
  const shippingPointPriceChartRef = useRef(null);

  const token = () => localStorage.getItem("authToken");

  // ── Auth guard ────────────────────────────────────────────
  useEffect(() => {
    if (!token()) {
      alert("You need to log in to access this dashboard.");
      window.location.href = "/login";
    }
  }, []);

  // ── Most Recent Prices ────────────────────────────────────
  const fetchMostRecentPrices = async (src = source) => {
    try {
      const r = await fetch(`/api/most_recent_prices?source=${src}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setPrices(data.prices);
    } catch {}
  };

  useEffect(() => { fetchMostRecentPrices(); }, []);

  const renderPricesTable = () => {
    const cityCols = ["Baltimore","Boston","Chicago","Columbia","Miami","New York","Philadelphia","Los Angeles","Detroit","Atlanta"];
    return COMMODITIES.map((commodity) => {
      let maxPrice = -Infinity, maxCity = null;
      cityCols.forEach((city) => {
        const cell = prices[commodity]?.[city];
        const p = typeof cell === "object" ? cell?.price : parseFloat(cell);
        if (!isNaN(p) && p > maxPrice) { maxPrice = p; maxCity = city; }
      });
      return (
        <tr key={commodity}>
          <td style={{ fontWeight: 600 }}>{commodity}</td>
          {cityCols.map((city) => {
            const cell = prices[commodity]?.[city];
            if (!cell || cell === "-" || typeof cell !== "object") {
              return <td key={city}>-</td>;
            }
            const isMax = city === maxCity;
            return (
              <td key={city} className={isMax ? "highlight-max" : ""} style={{ verticalAlign: "top", minWidth: 90 }}>
                <div style={{ fontWeight: 700, fontFamily: "var(--mono)", color: isMax ? undefined : "var(--up)" }}>
                  ${cell.price.toFixed(2)}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                  {cell.unit}
                </div>
                {cell.raw_price != null && (
                  <div style={{ fontSize: 10, color: "var(--text-3)" }}>
                    raw: ${cell.raw_price.toFixed(2)} <span style={{ opacity: 0.7 }}>{cell.raw_unit}</span>
                  </div>
                )}
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{cell.date}</div>
              </td>
            );
          })}
        </tr>
      );
    });
  };

  // ── Best Sell Market ──────────────────────────────────────
  const fetchBestSellMarket = async (filters) => {
    const { commodity, source: src, last7Days } = filters;
    try {
      const r = await fetch(`/api/best_sell_market?commodity=${commodity}&source=${src}&last7Days=${last7Days}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setBestMarketData(data.best_market);
      updateBestSellChart(data.best_market);
    } catch {}
  };

  useEffect(() => { fetchBestSellMarket(appliedFilters); }, []);

  const updateBestSellChart = (data) => {
    if (!bestSellChartRef.current) return;
    if (bestSellChartRef.current.chart) bestSellChartRef.current.chart.destroy();
    const ctx = bestSellChartRef.current.getContext("2d");
    bestSellChartRef.current.chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.map((d) => d.city_name),
        datasets: [{
          label: "Max Price",
          data: data.map((d) => (d.max_price === "-" ? 0 : parseFloat(d.max_price))),
          backgroundColor: CHART_COLORS[0] + "cc",
          borderColor: CHART_COLORS[0],
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: "y",
        plugins: { legend: { display: false }, tooltip: CHART_TOOLTIP, datalabels: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: CHART_GRID, ticks: CHART_TICKS, title: { display: true, text: "Price ($)", color: "#64748b", font: { size: 11 } } },
          y: { grid: CHART_GRID, ticks: CHART_TICKS },
        },
      },
    });
  };

  // ── Market Opportunity ────────────────────────────────────
  const fetchMarketOpportunity = async (src = opportunitySource) => {
    try {
      const r = await fetch(`/api/market_opportunity?source=${src}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setMarketOpportunityData(data.opportunities || []);
    } catch {}
  };

  useEffect(() => { fetchMarketOpportunity(); }, []);

  // ── Seasonal Trends ───────────────────────────────────────
  const updateSeasonalChart = async (filters = appliedSeasonalFilters) => {
    const params = new URLSearchParams({
      commodities: filters.commodities.join(","),
      cities: filters.cities.join(","),
      start_date: filters.startDate,
      end_date: filters.endDate,
      source: filters.source,
    });
    try {
      const r = await fetch(`/api/sales_seasonal_prices?${params}`);
      if (!r.ok) throw new Error();
      const data = await r.json();
      if (!seasonalChartRef.current) return;
      if (seasonalChartRef.current.chart) seasonalChartRef.current.chart.destroy();
      const ctx = seasonalChartRef.current.getContext("2d");
      seasonalChartRef.current.chart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Spring", "Summer", "Autumn", "Winter"],
          datasets: [{
            label: "Avg Seasonal Price",
            data: [data.Spring || 0, data.Summer || 0, data.Autumn || 0, data.Winter || 0],
            backgroundColor: SEASONAL_COLORS,
            borderWidth: 0,
            borderRadius: 4,
            barPercentage: 0.55,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { ...CHART_TOOLTIP, callbacks: { label: (ctx) => `$${ctx.parsed.y.toFixed(2)}` } },
            datalabels: {
              display: true,
              color: "#0f172a",
              font: { size: 13, weight: "600" },
              anchor: "end",
              align: "top",
              formatter: (v) => v > 0 ? `$${v.toFixed(0)}` : "",
            },
          },
          scales: {
            x: { grid: CHART_GRID, ticks: { ...CHART_TICKS, font: { family: "'Inter', sans-serif", size: 12 } } },
            y: { grid: CHART_GRID, ticks: { ...CHART_TICKS, callback: (v) => `$${v}` }, beginAtZero: true },
          },
        },
      });
    } catch {}
  };

  useEffect(() => { updateSeasonalChart(); }, []);

  // ── Historical Data ───────────────────────────────────────
  const getColor = (i) => CHART_COLORS[i % CHART_COLORS.length];

  const updateHistoricalChart = (chartData) => {
    if (!historicalChartRef.current) return;
    const ctx = historicalChartRef.current.getContext("2d");
    if (historicalChart) historicalChart.destroy();
    if (!chartData.labels.length || !chartData.datasets.length) { alert("No data for the selected criteria."); return; }
    const datasets = chartData.datasets.map((ds, i) => ({
      ...ds, fill: false, tension: 0.1, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, spanGaps: true,
      borderColor: ds.borderColor || getColor(i), backgroundColor: ds.backgroundColor || getColor(i),
    }));
    const newChart = new Chart(ctx, {
      type: "line",
      data: { labels: chartData.labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { type: "category", grid: CHART_GRID, ticks: { ...CHART_TICKS, maxTicksLimit: 10, maxRotation: 45, minRotation: 45 }, title: { display: true, text: "Date", color: "#64748b" } },
          y: { grid: CHART_GRID, ticks: { ...CHART_TICKS, callback: (v) => `$${v.toFixed(2)}` }, title: { display: true, text: "Price ($)", color: "#64748b" } },
        },
        plugins: {
          tooltip: { ...CHART_TOOLTIP, mode: "index", intersect: false, callbacks: {
            title: (ctx) => DateTime.fromISO(ctx[0].label).toFormat("MMM d, yyyy"),
            label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`,
          }},
          legend: { position: "top", labels: { boxWidth: 12, padding: 15, color: "#64748b", font: { size: 11 } } },
          datalabels: { display: false },
        },
        interaction: { mode: "index", intersect: false },
      },
    });
    setHistoricalChart(newChart);
  };

  const fetchHistoricalData = async (filters) => {
    const { commodities, cities, source: src, startDate, endDate, averageCommodities, averageCities } = filters;
    try {
      const r = await fetch(
        `/api/historical_data?commodities=${commodities.join(",")}&cities=${cities.join(",")}&source=${src}&start_date=${startDate}&end_date=${endDate}&averageCommodities=${averageCommodities}&averageCities=${averageCities}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      if (!r.ok) throw new Error();
      const data = await r.json();
      setHistoricalData(data);
      updateHistoricalChart(data);
    } catch {}
  };

  useEffect(() => { fetchHistoricalData(appliedHistoricalFilters); }, []);

  // ── Shipping Point ────────────────────────────────────────
  const updateShippingPointPriceChart = (chartData) => {
    if (!shippingPointPriceChartRef.current || !chartData?.labels?.length || !chartData?.datasets?.length) return;
    if (shippingPointPriceChart) shippingPointPriceChart.destroy();
    setShippingPointPriceChartData(chartData);
    const ctx = shippingPointPriceChartRef.current.getContext("2d");
    const datasets = chartData.datasets.map((ds, i) => ({
      ...ds, fill: false, tension: 0.1, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, spanGaps: true,
      borderColor: ds.borderColor || getColor(i), backgroundColor: ds.backgroundColor || getColor(i),
    }));
    const newChart = new Chart(ctx, {
      type: "line",
      data: { labels: chartData.labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { type: "category", grid: CHART_GRID, ticks: { ...CHART_TICKS, maxTicksLimit: 10, maxRotation: 45, minRotation: 45 }, title: { display: true, text: "Date", color: "#64748b" } },
          y: { grid: CHART_GRID, ticks: { ...CHART_TICKS, callback: (v) => `$${v.toFixed(2)}` }, title: { display: true, text: "Price ($)", color: "#64748b" } },
        },
        plugins: {
          tooltip: { ...CHART_TOOLTIP, mode: "index", intersect: false, callbacks: {
            title: (ctx) => DateTime.fromISO(ctx[0].label).toFormat("MMM d, yyyy"),
            label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`,
          }},
          legend: { position: "top", labels: { boxWidth: 12, padding: 15, color: "#64748b", font: { size: 11 } } },
          datalabels: { display: false },
        },
        interaction: { mode: "index", intersect: false },
      },
    });
    setShippingPointPriceChart(newChart);
  };

  const fetchShippingPointPriceData = async (filters = null) => {
    const f = filters || { commodities: ["Habanero"], regions: ["mexico crossings through texas"], source: "ProduceIQ", startDate: "2024-10-01", endDate: new Date().toISOString().split("T")[0] };
    try {
      const params = new URLSearchParams({
        commodities: f.commodities.join(","), regions: f.regions.join(","),
        source: f.source, start_date: f.startDate, end_date: f.endDate,
        averageCommodities: f.averageCommodities?.toString() || "false",
        averageRegions: f.averageRegions?.toString() || "false",
      });
      const r = await fetch(`/api/shipping_point_price?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!r.ok) throw new Error();
      const data = await r.json();
      updateShippingPointPriceChart(data);
    } catch {}
  };

  useEffect(() => { fetchShippingPointPriceData(); }, []);

  // ── Cleanup ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (bestSellChartRef.current?.chart) bestSellChartRef.current.chart.destroy();
      if (seasonalChartRef.current?.chart) seasonalChartRef.current.chart.destroy();
    };
  }, []);

  // ── Checkbox helpers ──────────────────────────────────────
  const mkCheckboxHandler = (setter, listKey) => (e) => {
    const v = e.target.value;
    setter((p) => ({ ...p, [listKey]: p[listKey].includes(v) ? p[listKey].filter((x) => x !== v) : [...p[listKey], v] }));
  };
  const mkSelectAllHandler = (setter, listKey, allItems) => (e) => {
    setter((p) => ({ ...p, [listKey]: e.target.checked ? allItems : [] }));
  };

  // ── Download helpers ──────────────────────────────────────
  const downloadExcel = (data, filename) => {
    if (!data) { alert("No data to download."); return; }
    const header = ["Date", ...data.datasets.map((d) => d.label)];
    const rows = data.labels.map((date, i) => [date, ...data.datasets.map((d) => d.data[i])]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, filename);
  };

  const downloadChart = (id, filename) => {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = filename;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Most Recent Prices ─────────────────────────────── */}
      <div className="sd-card">
        <div className="sd-card-head">
          <h2>Most Recent Prices</h2>
        </div>
        <FilterToggle show={showMostRecentFilters} onToggle={() => setShowMostRecentFilters((f) => !f)} />
        {showMostRecentFilters && (
          <div className="filter-panel">
            <div className="form-group">
              <label>Source</label>
              <select className="form-control" value={source} onChange={(e) => setSource(e.target.value)}>
                {["USDA", "ProduceIQ", "Both"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <button className="filter-apply-btn" onClick={() => fetchMostRecentPrices(source)}>Apply</button>
          </div>
        )}
        <div className="sd-card-body" style={{ overflowX: "auto" }}>
          <table className="sd-table">
            <thead>
              <tr>
                <th>Commodity</th>
                {["Baltimore","Boston","Chicago","Columbia","Miami","New York","Philadelphia","Los Angeles","Detroit","Atlanta"].map((c) => <th key={c}>{c}</th>)}
              </tr>
            </thead>
            <tbody>{renderPricesTable()}</tbody>
          </table>
        </div>
      </div>

      {/* ── Best Sell Market ────────────────────────────────── */}
      <div className="sd-card">
        <FilterToggle show={showBestSellFilters} onToggle={() => setShowBestSellFilters((f) => !f)} />
        {showBestSellFilters && (
          <div className="filter-panel">
            <div className="form-group">
              <label>Commodity</label>
              <select className="form-control" value={filterState.commodity} onChange={(e) => setFilterState((p) => ({ ...p, commodity: e.target.value }))}>
                {COMMODITIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Source</label>
              <select className="form-control" value={filterState.source} onChange={(e) => setFilterState((p) => ({ ...p, source: e.target.value }))}>
                {["USDA", "ProduceIQ"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-check" style={{ alignSelf: "flex-end", marginBottom: 4 }}>
              <input type="checkbox" id="last7" checked={filterState.last7Days} onChange={(e) => setFilterState((p) => ({ ...p, last7Days: e.target.checked }))} />
              <label htmlFor="last7" style={{ fontSize: 12, color: "var(--text-2)", marginLeft: 6 }}>Last 7 days only</label>
            </div>
            <button className="filter-apply-btn" onClick={() => { setAppliedFilters(filterState); fetchBestSellMarket(filterState); }}>Apply</button>
          </div>
        )}
        <div className="sd-row" style={{ padding: "0 0 0 0" }}>
          <div style={{ borderRight: "1px solid var(--border)" }}>
            <div className="sd-card-head" style={{ borderTop: "1px solid var(--border)" }}>
              <h2>Best Sell Market — {appliedFilters.commodity}</h2>
            </div>
            <div className="sd-card-body" style={{ overflowX: "auto" }}>
              <table className="sd-table">
                <thead>
                  <tr><th>City</th><th>Price</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {bestMarketData.length > 0 ? bestMarketData.map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{row.city_name}</td>
                      <td style={{ fontFamily: "var(--mono)", color: "var(--up)", fontWeight: 600 }}>{row.max_price !== "-" ? `$${parseFloat(row.max_price).toFixed(2)}` : "-"}</td>
                      <td style={{ color: "var(--text-3)", fontSize: 12 }}>{row.date || "-"}</td>
                    </tr>
                  )) : <tr><td colSpan="3" style={{ textAlign: "center", color: "var(--text-3)", padding: 24 }}>No data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="sd-card-head" style={{ borderTop: "1px solid var(--border)" }}>
              <h2>Market Graph</h2>
            </div>
            <div className="chart-wrap" style={{ height: 340 }}>
              <canvas id="bestSellChart" ref={bestSellChartRef} style={{ width: "100%", height: "100%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Seasonal Trends ─────────────────────────────────── */}
      <div className="sd-card">
        <div className="sd-card-head">
          <h2>Seasonal Trends</h2>
        </div>
        <FilterToggle show={showSeasonalFilters} onToggle={() => setShowSeasonalFilters((f) => !f)} />
        {showSeasonalFilters && (
          <div className="filter-panel">
            <div className="form-group">
              <label>Commodity</label>
              <div className="checkbox-container">
                <label className="select-all">
                  <input type="checkbox" checked={seasonalFilterState.commodities.length === COMMODITIES.length} onChange={mkSelectAllHandler(setSeasonalFilterState, "commodities", COMMODITIES)} /> Select All
                </label>
                {COMMODITIES.map((c) => (
                  <label key={c} className="checkbox-item">
                    <input type="checkbox" value={c} checked={seasonalFilterState.commodities.includes(c)} onChange={mkCheckboxHandler(setSeasonalFilterState, "commodities")} />{c}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>City</label>
              <div className="checkbox-container">
                <label className="select-all">
                  <input type="checkbox" checked={seasonalFilterState.cities.length === CITIES.length} onChange={mkSelectAllHandler(setSeasonalFilterState, "cities", CITIES)} /> Select All
                </label>
                {CITIES.map((c) => (
                  <label key={c} className="checkbox-item">
                    <input type="checkbox" value={c} checked={seasonalFilterState.cities.includes(c)} onChange={mkCheckboxHandler(setSeasonalFilterState, "cities")} />{c}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" className="form-control" value={seasonalFilterState.startDate} onChange={(e) => setSeasonalFilterState((p) => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" className="form-control" value={seasonalFilterState.endDate} onChange={(e) => setSeasonalFilterState((p) => ({ ...p, endDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Source</label>
              <select className="form-control" value={seasonalFilterState.source} onChange={(e) => setSeasonalFilterState((p) => ({ ...p, source: e.target.value }))}>
                {["USDA", "ProduceIQ", "Both"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <button className="filter-apply-btn" onClick={() => { setAppliedSeasonalFilters(seasonalFilterState); updateSeasonalChart(seasonalFilterState); }}>Apply</button>
          </div>
        )}
        <div style={{ padding: "20px", height: 360 }}>
          <canvas id="seasonalChart" ref={seasonalChartRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>

      {/* ── Historical Data ──────────────────────────────────── */}
      <div className="sd-card">
        <div className="sd-card-head">
          <h2>Historical Prices</h2>
        </div>
        <FilterToggle show={showHistoricalFilters} onToggle={() => setShowHistoricalFilters((f) => !f)} />
        {showHistoricalFilters && (
          <div className="filter-panel">
            <div className="form-group">
              <label>Commodity</label>
              <div className="checkbox-container">
                <label className="select-all">
                  <input type="checkbox" checked={historicalFilterState.commodities.length === COMMODITIES.length} onChange={mkSelectAllHandler(setHistoricalFilterState, "commodities", COMMODITIES)} /> Select All
                </label>
                {COMMODITIES.map((c) => (
                  <label key={c} className="checkbox-item">
                    <input type="checkbox" value={c} checked={historicalFilterState.commodities.includes(c)} onChange={mkCheckboxHandler(setHistoricalFilterState, "commodities")} />{c}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group form-check" style={{ display: "flex", alignItems: "center", gap: 6, flexDirection: "row", minWidth: 0 }}>
              <input type="checkbox" id="avgCom" checked={historicalFilterState.averageCommodities} onChange={(e) => setHistoricalFilterState((p) => ({ ...p, averageCommodities: e.target.checked }))} />
              <label htmlFor="avgCom" style={{ fontSize: 12, color: "var(--text-2)" }}>Avg commodities</label>
            </div>
            <div className="form-group">
              <label>City</label>
              <div className="checkbox-container">
                <label className="select-all">
                  <input type="checkbox" checked={historicalFilterState.cities.length === CITIES.length} onChange={mkSelectAllHandler(setHistoricalFilterState, "cities", CITIES)} /> Select All
                </label>
                {CITIES.map((c) => (
                  <label key={c} className="checkbox-item">
                    <input type="checkbox" value={c} checked={historicalFilterState.cities.includes(c)} onChange={mkCheckboxHandler(setHistoricalFilterState, "cities")} />{c}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group form-check" style={{ display: "flex", alignItems: "center", gap: 6, flexDirection: "row", minWidth: 0 }}>
              <input type="checkbox" id="avgCit" checked={historicalFilterState.averageCities} onChange={(e) => setHistoricalFilterState((p) => ({ ...p, averageCities: e.target.checked }))} />
              <label htmlFor="avgCit" style={{ fontSize: 12, color: "var(--text-2)" }}>Avg cities</label>
            </div>
            <div className="form-group">
              <label>Source</label>
              <select className="form-control" value={historicalFilterState.source} onChange={(e) => setHistoricalFilterState((p) => ({ ...p, source: e.target.value }))}>
                {["USDA", "ProduceIQ"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" className="form-control" value={historicalFilterState.startDate} onChange={(e) => setHistoricalFilterState((p) => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" className="form-control" value={historicalFilterState.endDate} onChange={(e) => setHistoricalFilterState((p) => ({ ...p, endDate: e.target.value }))} />
            </div>
            <button className="filter-apply-btn" onClick={() => { setAppliedHistoricalFilters(historicalFilterState); fetchHistoricalData(historicalFilterState); }}>Apply</button>
          </div>
        )}
        <div style={{ padding: "16px 20px 20px", height: 420 }}>
          <canvas id="historicalChart" ref={historicalChartRef} style={{ width: "100%", height: "100%" }} />
        </div>
        <div style={{ padding: "0 20px 16px" }}>
          <button className="sd-download-btn" onClick={() => { downloadChart("historicalChart", "historical_prices.png"); downloadExcel(historicalData, "historical_data.xlsx"); }}>
            ↓ Download Chart &amp; Data
          </button>
        </div>
      </div>

      {/* ── Shipping Point Price ─────────────────────────────── */}
      <div className="sd-card">
        <div className="sd-card-head">
          <h2>Shipping Point Price</h2>
        </div>
        <FilterToggle show={showShippingFilters} onToggle={() => setShowShippingFilters((f) => !f)} />
        {showShippingFilters && (
          <div className="filter-panel">
            <div className="form-group">
              <label>Commodity</label>
              <div className="checkbox-container">
                <label className="select-all">
                  <input type="checkbox" checked={shippingPointFilterState.commodities.length === COMMODITIES.length} onChange={mkSelectAllHandler(setShippingPointFilterState, "commodities", COMMODITIES)} /> Select All
                </label>
                {COMMODITIES.map((c) => (
                  <label key={c} className="checkbox-item">
                    <input type="checkbox" value={c} checked={shippingPointFilterState.commodities.includes(c)} onChange={mkCheckboxHandler(setShippingPointFilterState, "commodities")} />{c}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group form-check" style={{ display: "flex", alignItems: "center", gap: 6, flexDirection: "row", minWidth: 0 }}>
              <input type="checkbox" id="avgShipCom" checked={shippingPointFilterState.averageCommodities} onChange={(e) => setShippingPointFilterState((p) => ({ ...p, averageCommodities: e.target.checked }))} />
              <label htmlFor="avgShipCom" style={{ fontSize: 12, color: "var(--text-2)" }}>Avg commodities</label>
            </div>
            <div className="form-group">
              <label>Region</label>
              <div className="checkbox-container">
                <label className="select-all">
                  <input type="checkbox" checked={shippingPointFilterState.regions.length === REGIONS.length} onChange={mkSelectAllHandler(setShippingPointFilterState, "regions", REGIONS)} /> Select All
                </label>
                {REGIONS.map((r) => (
                  <label key={r} className="checkbox-item">
                    <input type="checkbox" value={r} checked={shippingPointFilterState.regions.includes(r)} onChange={mkCheckboxHandler(setShippingPointFilterState, "regions")} />{r}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group form-check" style={{ display: "flex", alignItems: "center", gap: 6, flexDirection: "row", minWidth: 0 }}>
              <input type="checkbox" id="avgReg" checked={shippingPointFilterState.averageRegions} onChange={(e) => setShippingPointFilterState((p) => ({ ...p, averageRegions: e.target.checked }))} />
              <label htmlFor="avgReg" style={{ fontSize: 12, color: "var(--text-2)" }}>Avg regions</label>
            </div>
            <div className="form-group">
              <label>Source</label>
              <select className="form-control" value={shippingPointFilterState.source} onChange={(e) => setShippingPointFilterState((p) => ({ ...p, source: e.target.value }))}>
                {["ProduceIQ", "USDA"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" className="form-control" value={shippingPointFilterState.startDate} onChange={(e) => setShippingPointFilterState((p) => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" className="form-control" value={shippingPointFilterState.endDate} onChange={(e) => setShippingPointFilterState((p) => ({ ...p, endDate: e.target.value }))} />
            </div>
            <button className="filter-apply-btn" onClick={() => { setAppliedShippingPointFilters(shippingPointFilterState); fetchShippingPointPriceData(shippingPointFilterState); }}>Apply</button>
          </div>
        )}
        <div style={{ padding: "16px 20px 20px", height: 420 }}>
          <canvas id="shippingPointPriceChart" ref={shippingPointPriceChartRef} style={{ width: "100%", height: "100%" }} />
        </div>
        <div style={{ padding: "0 20px 16px" }}>
          <button className="sd-download-btn" onClick={() => { downloadChart("shippingPointPriceChart", "shipping_point_price.png"); downloadExcel(shippingPointPriceChartData, "shipping_point_data.xlsx"); }}>
            ↓ Download Chart &amp; Data
          </button>
        </div>
      </div>

      {/* ── Market Opportunity ───────────────────────────────── */}
      <div className="sd-card">
        <div className="sd-card-head">
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Market Opportunity</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Best city per commodity · last 7 days</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select style={{ fontSize: 12, padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface)", color: "var(--text)" }} value={opportunitySource} onChange={(e) => { setOpportunitySource(e.target.value); fetchMarketOpportunity(e.target.value); }}>
              {["USDA", "ProduceIQ"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="sd-table">
            <thead>
              <tr>
                {["Commodity", "Best Market", "Max Price", "Avg Price", "Min Price", "Spread", "Signal"].map((h) => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {marketOpportunityData.length > 0 ? marketOpportunityData.map((row, i) => {
                const spread = row.max_price != null && row.min_price != null ? (row.max_price - row.min_price) : null;
                const rec = spread == null ? { text: "No data", color: "var(--text-3)", bg: "var(--surface-2)" }
                          : spread > 8 ? { text: "High opportunity", color: "#059669", bg: "#d1fae5" }
                          : spread > 4 ? { text: "Moderate", color: "#d97706", bg: "#fef3c7" }
                          : { text: "Low spread", color: "var(--text-3)", bg: "var(--surface-2)" };
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{row.commodity}</td>
                    <td style={{ fontWeight: 500, color: "var(--accent)" }}>{row.best_city || "—"}</td>
                    <td style={{ fontFamily: "var(--mono)", fontWeight: 600, color: "#059669" }}>{row.max_price != null ? `$${row.max_price.toFixed(2)}` : "—"}</td>
                    <td style={{ fontFamily: "var(--mono)" }}>{row.avg_price != null ? `$${row.avg_price.toFixed(2)}` : "—"}</td>
                    <td style={{ fontFamily: "var(--mono)", color: "#dc2626" }}>{row.min_price != null ? `$${row.min_price.toFixed(2)}` : "—"}</td>
                    <td style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{spread != null ? `$${spread.toFixed(2)}` : "—"}</td>
                    <td><span style={{ background: rec.bg, color: rec.color, padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{rec.text}</span></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="7" style={{ textAlign: "center", color: "var(--text-3)", padding: 32 }}>Loading market opportunity data…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default SalesDashboard;
