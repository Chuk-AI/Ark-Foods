import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ScatterChart, Scatter, LineChart, Line, Legend,
} from "recharts";
import "../styles/analytics.css";

// ── Constants ─────────────────────────────────────────────────────────────────
const COMMODITIES = [
  "Anaheim", "Cubanelles", "Fresno", "Habanero", "Hungarian Wax",
  "Jalapeno", "Long Hot", "Poblano", "Serrano", "Shishito",
];
const TIME_FRAMES = ["3d", "7d", "1m", "3m", "1y"];
const TABS = [
  { id: "distribution", label: "Price Distribution" },
  { id: "empirical", label: "Empirical" },
  { id: "correlation", label: "Correlations" },
  { id: "scatter", label: "Scatter" },
  { id: "rolling", label: "Rolling Correlation" },
];

function mapCubanelle(commodity, source) {
  if (commodity === "Cubanelles" && source === "USDA") return "Cubanelle";
  if (commodity === "Cubanelle" && source === "ProduceIQ") return "Cubanelles";
  return commodity;
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function TimeFramePicker({ value, onChange }) {
  return (
    <div className="an-pill-row">
      {TIME_FRAMES.map((f) => (
        <button
          key={f}
          className={`an-pill${value === f ? " active" : ""}`}
          onClick={() => onChange(f)}
        >
          {f.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function SourceToggle({ value, onChange }) {
  return (
    <div className="an-source-toggle">
      {["USDA", "ProduceIQ"].map((s) => (
        <button
          key={s}
          className={`an-source-btn${value === s ? " active" : ""}`}
          onClick={() => onChange(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function MarketToggle({ value, onChange }) {
  return (
    <div className="an-source-toggle">
      {["terminal", "shipping"].map((m) => (
        <button
          key={m}
          className={`an-source-btn${value === m ? " active" : ""}`}
          onClick={() => onChange(m)}
          style={{ textTransform: "capitalize" }}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

function LoadingSpinner() {
  return <div className="an-loading">Loading…</div>;
}

function EmptyState({ msg = "No data available" }) {
  return <div className="an-empty">{msg}</div>;
}

// ── Box tooltip shared by violin/distribution charts ──────────────────────────
function BoxTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="an-tooltip">
      <div className="an-tooltip-title">{d.name}</div>
      {[["Max", d.max], ["Q3", d.q3], ["Median", d.median], ["Mean", d.mean], ["Q1", d.q1], ["Min", d.min]].map(
        ([k, v]) => v != null && (
          <div key={k} className="an-tooltip-row">
            <span>{k}</span><strong>${v.toFixed(2)}</strong>
          </div>
        )
      )}
      {d.unit && <div className="an-tooltip-meta">per {d.unit}</div>}
      {d.count != null && <div className="an-tooltip-meta">n = {d.count}</div>}
    </div>
  );
}

// ── Tab: Price Distribution (violin-style bar charts) ─────────────────────────
function DistributionTab() {
  const [timeFrame, setTimeFrame] = useState("7d");
  const [terminalData, setTerminalData] = useState(null);
  const [shippingData, setShippingData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (tf) => {
    setLoading(true);
    try {
      const [tr, sr] = await Promise.all([
        axios.get(`/api/terminal_price_violin?timeFrame=${tf}`),
        axios.get(`/api/shipping_price_violin?timeFrame=${tf}`),
      ]);
      setTerminalData(tr.data);
      setShippingData(sr.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(timeFrame); }, [timeFrame, fetchData]);

  const renderBar = (data, color, title) => {
    if (!data?.length) return <EmptyState msg={`No ${title} data`} />;
    return (
      <div className="an-chart-block">
        <div className="an-chart-subtitle">{title}</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
            <Tooltip content={<BoxTooltip />} />
            <Bar dataKey="median" fill={color} radius={[4, 4, 0, 0]} name="Median" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="sd-card">
      <div className="sd-card-head">
        <h2>Price Distribution</h2>
        <TimeFramePicker value={timeFrame} onChange={(f) => { setTimeFrame(f); fetchData(f); }} />
      </div>
      <div style={{ padding: "16px 20px" }}>
        {loading ? <LoadingSpinner /> : (
          <>
            <div className="an-two-col">
              {renderBar(terminalData?.usda, "var(--accent)", "Terminal · USDA")}
              {renderBar(terminalData?.produceiq, "#0369a1", "Terminal · ProduceIQ")}
            </div>
            <div className="an-divider" />
            {renderBar(shippingData?.data, "var(--up)", "Shipping Point Prices")}
          </>
        )}
      </div>
    </div>
  );
}

// ── Tab: Empirical Probability ────────────────────────────────────────────────
function EmpiricalTab() {
  const [timeFrame, setTimeFrame] = useState("7d");
  const [market, setMarket] = useState("terminal");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (tf, mkt) => {
    setLoading(true);
    try {
      const ep = mkt === "terminal"
        ? `/api/terminal_empricial_probability?timeFrame=${tf}`
        : `/api/shipping_empricial_probability?timeFrame=${tf}`;
      const r = await axios.get(ep);
      setData(r.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(timeFrame, market); }, [timeFrame, market, fetchData]);

  return (
    <div className="sd-card">
      <div className="sd-card-head">
        <h2>Empirical Price Distribution</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <MarketToggle value={market} onChange={(m) => { setMarket(m); fetchData(timeFrame, m); }} />
          <TimeFramePicker value={timeFrame} onChange={(f) => { setTimeFrame(f); fetchData(f, market); }} />
        </div>
      </div>
      <div style={{ padding: "16px 20px" }}>
        {loading ? <LoadingSpinner /> : data.length === 0 ? <EmptyState /> : (
          <div className="an-grid">
            {data.map((chart, i) => (
              <div key={i} className="an-grid-item">
                <div className="an-chart-subtitle">{chart.commodity}</div>
                <div className="an-stats-row">
                  <span>Mean <strong>${chart.mean?.toFixed(2)}</strong></span>
                  <span>Std <strong>${chart.stdDev?.toFixed(2)}</strong></span>
                  <span>Median <strong>${chart.median?.toFixed(2)}</strong></span>
                  {chart.unit && <span style={{ color: 'var(--text-3)', fontSize: 11 }}>per {chart.unit}</span>}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chart.bins} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="x" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${Number(v).toFixed(1)}`} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [v, "Count"]} labelFormatter={(v) => `$${Number(v).toFixed(2)}`} />
                    <Bar dataKey="y" fill="var(--accent)" radius={[2, 2, 0, 0]} />
                    <ReferenceLine x={chart.mean} stroke="var(--down)" strokeDasharray="4 4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Correlations heatmap ─────────────────────────────────────────────────
function CorrelationTab() {
  const [source, setSource] = useState("ProduceIQ");
  const [termChart, setTermChart] = useState(null);
  const [shipChart, setShipChart] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (src) => {
    setLoading(true);
    try {
      const [tr, sr] = await Promise.all([
        axios.get(`/api/terminal_correlation?source=${src}`),
        axios.get(`/api/shipping_correlation?source=${src}`),
      ]);
      setTermChart(tr.data.chart);
      setShipChart(sr.data.chart);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(source); }, [source, fetchData]);

  const renderHeatmap = (chart, title) => {
    if (!chart?.commodities) return <EmptyState msg={`No ${title} data`} />;
    return (
      <div className="an-chart-block">
        <div className="an-chart-subtitle">{title}</div>
        <div style={{ overflowX: "auto" }}>
          <table className="an-heatmap">
            <thead>
              <tr>
                <th />
                {chart.commodities.map((c) => <th key={c}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {chart.commodities.map((rowC) => (
                <tr key={rowC}>
                  <th>{rowC}</th>
                  {chart.commodities.map((colC) => {
                    const cell = chart.matrix.find((m) => m.row === rowC && m.col === colC);
                    const v = cell ? cell.value : 0;
                    const abs = Math.abs(v);
                    const bg = v > 0
                      ? `rgba(var(--up-rgb, 34,197,94), ${abs * 0.75})`
                      : `rgba(var(--down-rgb, 239,68,68), ${abs * 0.75})`;
                    return (
                      <td
                        key={colC}
                        title={`${rowC} vs ${colC}: ${v}`}
                        style={{
                          background: abs > 0.05 ? (v > 0 ? `rgba(34,197,94,${abs * 0.7})` : `rgba(239,68,68,${abs * 0.7})`) : "var(--surface)",
                          color: abs > 0.5 ? "#fff" : "var(--text)",
                        }}
                      >
                        {v.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="sd-card">
      <div className="sd-card-head">
        <h2>Price Correlations</h2>
        <SourceToggle value={source} onChange={(s) => { setSource(s); fetchData(s); }} />
      </div>
      <div style={{ padding: "16px 20px" }}>
        {loading ? <LoadingSpinner /> : (
          <>
            {renderHeatmap(termChart, "Terminal Market Correlations")}
            <div className="an-divider" />
            {renderHeatmap(shipChart, "Shipping Point Correlations")}
          </>
        )}
      </div>
    </div>
  );
}

// ── Tab: Scatter plot ─────────────────────────────────────────────────────────
function ScatterTab() {
  const [commX, setCommX] = useState("");
  const [commY, setCommY] = useState("");
  const [market, setMarket] = useState("terminal");
  const [source, setSource] = useState("ProduceIQ");
  const [plotData, setPlotData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    if (!commX || !commY || commX === commY) {
      setError("Select two different commodities.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const ep = market === "terminal"
        ? "/api/terminal_scatterplot_matrix"
        : "/api/shipping_scatterplot_matrix";
      const r = await axios.post(ep, {
        commodity_x: mapCubanelle(commX, source),
        commodity_y: mapCubanelle(commY, source),
        source,
      });
      if (r.data.error) setError(r.data.error);
      else setPlotData(r.data);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to fetch.");
    }
    setLoading(false);
  };

  return (
    <div className="sd-card">
      <div className="sd-card-head">
        <h2>Scatter Plot</h2>
      </div>
      <div style={{ padding: "16px 20px" }}>
        <div className="an-controls">
          <div className="an-control-group">
            <label className="an-label">X Commodity</label>
            <select className="an-select" value={commX} onChange={(e) => setCommX(e.target.value)}>
              <option value="">Select…</option>
              {COMMODITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="an-control-group">
            <label className="an-label">Y Commodity</label>
            <select className="an-select" value={commY} onChange={(e) => setCommY(e.target.value)}>
              <option value="">Select…</option>
              {COMMODITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="an-control-group">
            <label className="an-label">Market</label>
            <MarketToggle value={market} onChange={setMarket} />
          </div>
          <div className="an-control-group">
            <label className="an-label">Source</label>
            <SourceToggle value={source} onChange={setSource} />
          </div>
          <button className="an-run-btn" onClick={fetchData} disabled={loading}>
            {loading ? "Loading…" : "Generate"}
          </button>
        </div>
        {error && <div className="an-error">{error}</div>}
        {plotData && (
          <div className="an-chart-block" style={{ marginTop: 20 }}>
            <div className="an-chart-subtitle">
              {plotData.commodity_x} vs {plotData.commodity_y}
              {plotData.correlation != null && (
                <span className="an-corr-badge">r = {plotData.correlation.toFixed(3)}</span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={360}>
              <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={plotData.commodity_x}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${v}`}
                  label={{ value: plotData.commodity_x, position: "insideBottom", offset: -4, fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={plotData.commodity_y}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${v}`}
                  label={{ value: plotData.commodity_y, angle: -90, position: "insideLeft", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(v, n) => [`$${Number(v).toFixed(2)}`, n]}
                />
                <Scatter
                  data={(() => { const t = plotData?.data?.[0]; return t ? t.x.map((x,i) => ({x, y:t.y[i]})).filter(p=>p.x!=null&&p.y!=null) : []; })()}
                  fill="var(--accent)"
                  opacity={0.65}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Rolling Correlation ──────────────────────────────────────────────────
function RollingTab() {
  const [series1, setSeries1] = useState("");
  const [series2, setSeries2] = useState("");
  const [windowDays, setWindowDays] = useState(30);
  const [market, setMarket] = useState("terminal");
  const [source, setSource] = useState("USDA");
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    if (!series1 || !series2 || series1 === series2) {
      setError("Select two different commodities.");
      return;
    }
    if (windowDays < 5) { setError("Window must be ≥ 5 days."); return; }
    setError("");
    setLoading(true);
    try {
      const ep = market === "terminal"
        ? "/api/terminal_rolling_correlations"
        : "/api/shipping_rolling_correlations";
      const r = await axios.post(ep, {
        series1: mapCubanelle(series1, source),
        series2: mapCubanelle(series2, source),
        window: windowDays,
        source,
      });
      setChartData(r.data);
    } catch (e) {
      setError(e.response?.data?.error || "Failed to fetch.");
    }
    setLoading(false);
  };

  const linePoints = (chartData?.dates || [])
    .map((d, i) => ({ date: d, correlation: chartData.values[i] }))
    .filter((p) => p.correlation != null && !isNaN(p.correlation));

  return (
    <div className="sd-card">
      <div className="sd-card-head">
        <h2>Rolling Correlation</h2>
      </div>
      <div style={{ padding: "16px 20px" }}>
        <div className="an-controls">
          <div className="an-control-group">
            <label className="an-label">Commodity 1</label>
            <select className="an-select" value={series1} onChange={(e) => setSeries1(e.target.value)}>
              <option value="">Select…</option>
              {COMMODITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="an-control-group">
            <label className="an-label">Commodity 2</label>
            <select className="an-select" value={series2} onChange={(e) => setSeries2(e.target.value)}>
              <option value="">Select…</option>
              {COMMODITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="an-control-group">
            <label className="an-label">Window (days)</label>
            <input
              type="number"
              className="an-input"
              style={{ width: 72 }}
              min="5"
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
            />
          </div>
          <div className="an-control-group">
            <label className="an-label">Market</label>
            <MarketToggle value={market} onChange={setMarket} />
          </div>
          <div className="an-control-group">
            <label className="an-label">Source</label>
            <SourceToggle value={source} onChange={setSource} />
          </div>
          <button className="an-run-btn" onClick={fetchData} disabled={loading}>
            {loading ? "Loading…" : "Generate"}
          </button>
        </div>
        {error && <div className="an-error">{error}</div>}
        {chartData && (
          <div className="an-chart-block" style={{ marginTop: 20 }}>
            <div className="an-chart-subtitle">
              {chartData.window}-day rolling: {chartData.series1} vs {chartData.series2}
            </div>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart
                data={linePoints}
                margin={{ top: 8, right: 16, left: 0, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  interval={Math.max(1, Math.floor(linePoints.length / 8))}
                />
                <YAxis domain={[-1, 1]} tick={{ fontSize: 11 }} tickFormatter={(v) => v.toFixed(2)} />
                <Tooltip formatter={(v) => [v.toFixed(4), "Correlation"]} />
                <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
                <ReferenceLine y={0.5} stroke="var(--up)" strokeDasharray="2 4" strokeOpacity={0.5} />
                <ReferenceLine y={-0.5} stroke="var(--down)" strokeDasharray="2 4" strokeOpacity={0.5} />
                <Line type="monotone" dataKey="correlation" stroke="var(--accent)" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DashAnalytics() {
  const [tab, setTab] = useState("distribution");

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Tab bar */}
      <div className="an-tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`an-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "distribution" && <DistributionTab />}
      {tab === "empirical" && <EmpiricalTab />}
      {tab === "correlation" && <CorrelationTab />}
      {tab === "scatter" && <ScatterTab />}
      {tab === "rolling" && <RollingTab />}
    </div>
  );
}
