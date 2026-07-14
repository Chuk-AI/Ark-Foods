import React from "react";
import Chart from "chart.js/auto";
import "chartjs-plugin-datalabels";
import "chartjs-adapter-luxon";
import { DateTime } from "luxon";
import { useEffect, useState, useRef } from "react";
import "../styles/sales_styles.css";
import * as XLSX from "xlsx";

const CHART_COLORS = [
  "#0d9488",
  "#6366f1",
  "#f97316",
  "#22c55e",
  "#f43f5e",
  "#eab308",
];

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

function HistoricalPrices() {
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

  const [availableUnits, setAvailableUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);

  const [showHistoricalFilters, setShowHistoricalFilters] = useState(false);
  const [showShippingFilters, setShowShippingFilters] = useState(false);

  const historicalChartRef = useRef(null);
  const shippingPointPriceChartRef = useRef(null);

  const token = () => localStorage.getItem("authToken");
  const getColor = (i) => CHART_COLORS[i % CHART_COLORS.length];

  const mkCheckboxHandler = (setter, listKey) => (e) => {
    const v = e.target.value;
    setter((p) => ({ ...p, [listKey]: p[listKey].includes(v) ? p[listKey].filter((x) => x !== v) : [...p[listKey], v] }));
  };
  const mkSelectAllHandler = (setter, listKey, allItems) => (e) => {
    setter((p) => ({ ...p, [listKey]: e.target.checked ? allItems : [] }));
  };

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
            label: (ctx) => { const u = ctx.dataset.unit; return u ? `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)} / ${u}` : `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`; },
          }},
          legend: { position: "top", labels: { boxWidth: 12, padding: 15, color: "#64748b", font: { size: 11 } } },
          datalabels: { display: false },
        },
        interaction: { mode: "index", intersect: false },
      },
    });
    setHistoricalChart(newChart);
  };

  const fetchHistoricalData = async (filters, unit = null) => {
    const { commodities, cities, source: src, startDate, endDate, averageCommodities, averageCities } = filters;
    try {
      let url = `/api/historical_data?commodities=${commodities.join(",")}&cities=${cities.join(",")}&source=${src}&start_date=${startDate}&end_date=${endDate}&averageCommodities=${averageCommodities}&averageCities=${averageCities}`;
      if (unit) url += `&unit=${encodeURIComponent(unit)}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setHistoricalData(data);
      if (data.available_units) setAvailableUnits(data.available_units);
      updateHistoricalChart(data);
    } catch {}
  };

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
            label: (ctx) => { const u = ctx.dataset.unit; return u ? `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)} / ${u}` : `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`; },
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

  useEffect(() => { fetchHistoricalData(appliedHistoricalFilters); }, []);
  useEffect(() => { fetchShippingPointPriceData(); }, []);

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>

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
            <button className="filter-apply-btn" onClick={() => { setSelectedUnit(null); setAvailableUnits([]); setAppliedHistoricalFilters(historicalFilterState); fetchHistoricalData(historicalFilterState, null); }}>Apply</button>
          </div>
        )}
        {availableUnits.length > 1 && (
          <div style={{ padding: "8px 20px 4px", display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 500, whiteSpace: "nowrap" }}>Unit:</label>
            <select
              className="form-control"
              style={{ width: "auto", fontSize: 12, padding: "4px 8px", maxWidth: 200 }}
              value={selectedUnit || ""}
              onChange={(e) => {
                const u = e.target.value || null;
                setSelectedUnit(u);
                fetchHistoricalData(appliedHistoricalFilters, u);
              }}
            >
              <option value="">Auto (dominant)</option>
              {availableUnits.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
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

    </div>
  );
}

export default HistoricalPrices;
