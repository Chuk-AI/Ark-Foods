import React, { useState, useEffect, useContext } from "react";
import { UserContext } from "../components/userContext";
import axios from "axios";
import "../styles/alerts.css";
import "../styles/sales_styles.css";

const COMMODITIES = [
  "Anaheim", "Cubanelles", "Fresno", "Habanero", "Hungarian Wax",
  "Jalapeno", "Long Hot", "Poblano", "Serrano", "Shishito",
];
const CITIES = [
  "Baltimore", "Boston", "Chicago", "Columbia", "Los Angeles",
  "Miami", "New York", "Philadelphia", "Detroit", "Atlanta",
];

const BellIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

function AlertRow({ alert, onUpdate, onDelete }) {
  const [localThreshold, setLocalThreshold] = useState(String(alert.threshold));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleThresholdChange = (e) => {
    setLocalThreshold(e.target.value);
    setDirty(true);
  };

  const saveThreshold = async () => {
    const val = parseFloat(localThreshold);
    if (isNaN(val)) return;
    setSaving(true);
    await onUpdate(alert.id, { threshold: val });
    setDirty(false);
    setSaving(false);
  };

  return (
    <tr>
      <td style={{ fontWeight: 500 }}>{alert.commodity}</td>
      <td style={{ color: "var(--text-2)" }}>{alert.city}</td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="number"
            className="al-input"
            style={{ width: 72 }}
            value={localThreshold}
            onChange={handleThresholdChange}
            min="-100"
            max="100"
            step="0.5"
          />
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>%</span>
          {dirty && (
            <button className="al-save-btn" onClick={saveThreshold} disabled={saving}>
              {saving ? "…" : <CheckIcon />}
            </button>
          )}
        </div>
      </td>
      <td>
        <button
          className={`al-toggle ${alert.isActive ? "active" : "paused"}`}
          onClick={() => onUpdate(alert.id, { isActive: !alert.isActive })}
        >
          {alert.isActive ? "Active" : "Paused"}
        </button>
      </td>
      <td>
        <button className="al-icon-btn danger" onClick={() => onDelete(alert)}>
          <TrashIcon />
        </button>
      </td>
    </tr>
  );
}

function NotificationItem({ notif, onRead, onDelete }) {
  const isIncrease = notif.title?.toLowerCase().includes("increase");
  const isDecrease = notif.title?.toLowerCase().includes("decrease");
  const borderColor = isIncrease ? "var(--down)" : isDecrease ? "var(--up)" : "var(--accent)";
  const badgeBg = isIncrease ? "var(--down-soft)" : isDecrease ? "var(--up-soft)" : "var(--accent-soft)";
  const badgeColor = isIncrease ? "var(--down)" : isDecrease ? "var(--up)" : "var(--accent)";
  const badgeLabel = isIncrease ? "↑ Price Up" : isDecrease ? "↓ Price Down" : "Alert";

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      + " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <div
      className={`al-notif-item${notif.is_read ? "" : " unread"}`}
      style={{ borderLeftColor: borderColor }}
      onClick={() => !notif.is_read && onRead(notif.id)}
    >
      <div className="al-notif-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {!notif.is_read && <span className="al-unread-dot" />}
          <span className="al-badge" style={{ background: badgeBg, color: badgeColor }}>{badgeLabel}</span>
          <span className="al-notif-title">{notif.title}</span>
        </div>
        <button
          className="al-icon-btn"
          onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }}
          title="Dismiss"
        >
          <TrashIcon />
        </button>
      </div>
      <p className="al-notif-message">{notif.message}</p>
      <div className="al-notif-meta">{formatDate(notif.created_at)}</div>
    </div>
  );
}

const Alerts = () => {
  const { isAuthenticated } = useContext(UserContext);

  const [alertSettings, setAlertSettings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("notifications");

  const [newAlert, setNewAlert] = useState({
    commodity: "Anaheim",
    city: "New York",
    threshold: 5,
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (isAuthenticated) {
      fetchAlertSettings();
      fetchNotifications();
    }
  }, [isAuthenticated]);

  const fetchAlertSettings = async () => {
    try {
      const r = await axios.get("/api/alert-entries-fresh", {
        params: { _: Date.now() },
      });
      setAlertSettings(r.data);
    } catch {}
  };

  const fetchNotifications = async () => {
    try {
      const r = await axios.get("/api/notifications");
      setNotifications(r.data);
    } catch {}
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      const r = await axios.post("/api/alert-settings", { ...newAlert, isActive: true });
      setAlertSettings((prev) => [...prev, r.data]);
    } catch (err) {
      setCreateError(err.response?.data?.error || "Failed to create alert.");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateAlert = async (id, updates) => {
    try {
      await axios.patch(`/api/alert-settings/${id}`, updates);
      setAlertSettings((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );
    } catch {}
  };

  const handleDeleteAlert = async (alertItem) => {
    if (!window.confirm(`Delete alert for ${alertItem.commodity} in ${alertItem.city}?`)) return;
    try {
      await axios.post("/api/delete-alert-by-id", { id: alertItem.id });
      setAlertSettings((prev) => prev.filter((a) => a.id !== alertItem.id));
    } catch (err) {
      alert("Failed to delete: " + (err.response?.data?.error || err.message));
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.patch(`/api/notifications/${id}`, { read: true });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await axios.post("/api/notifications/mark-all-read", {});
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  const deleteNotification = async (id) => {
    try {
      await axios.delete(`/api/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {}
  };

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Tab header ──────────────────────────────────────── */}
      <div className="al-tab-bar">
        <button
          className={`al-tab${activeTab === "notifications" ? " active" : ""}`}
          onClick={() => setActiveTab("notifications")}
        >
          <BellIcon />
          Notifications
          {unreadCount > 0 && <span className="al-count-badge">{unreadCount}</span>}
        </button>
        <button
          className={`al-tab${activeTab === "settings" ? " active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          Alert Settings
        </button>
      </div>

      {/* ── Notifications tab ────────────────────────────────── */}
      {activeTab === "notifications" && (
        <div className="sd-card">
          <div className="sd-card-head">
            <h2>
              Price Notifications
              {unreadCount > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: "var(--down)",
                  background: "var(--down-soft)", borderRadius: 10, padding: "2px 7px" }}>
                  {unreadCount} unread
                </span>
              )}
            </h2>
            {unreadCount > 0 && (
              <button className="al-text-btn" onClick={markAllAsRead}>
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="al-empty">
              <BellIcon />
              <div>No notifications yet</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                Alerts will appear here when prices cross your thresholds
              </div>
            </div>
          ) : (
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notif={n}
                  onRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Alert Settings tab ───────────────────────────────── */}
      {activeTab === "settings" && (
        <>
          {/* Create form */}
          <div className="sd-card">
            <div className="sd-card-head">
              <h2>Create New Alert</h2>
            </div>
            <form onSubmit={handleCreateAlert} style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label className="al-label">Commodity</label>
                  <select
                    className="al-select"
                    value={newAlert.commodity}
                    onChange={(e) => setNewAlert((p) => ({ ...p, commodity: e.target.value }))}
                    required
                  >
                    {COMMODITIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label className="al-label">City</label>
                  <select
                    className="al-select"
                    value={newAlert.city}
                    onChange={(e) => setNewAlert((p) => ({ ...p, city: e.target.value }))}
                    required
                  >
                    {CITIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label className="al-label">
                    Threshold (%)
                    <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: 4 }}>
                      positive = price up · negative = price down
                    </span>
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="number"
                      className="al-input"
                      style={{ width: 80 }}
                      value={newAlert.threshold}
                      onChange={(e) => setNewAlert((p) => ({ ...p, threshold: e.target.value }))}
                      min="-100"
                      max="100"
                      step="0.5"
                      required
                    />
                    <span style={{ fontSize: 12, color: "var(--text-3)" }}>%</span>
                  </div>
                </div>
                <button type="submit" className="al-create-btn" disabled={creating}>
                  <PlusIcon />
                  {creating ? "Creating…" : "Create Alert"}
                </button>
              </div>
              {createError && (
                <div style={{ marginTop: 10, fontSize: 12, color: "var(--down)" }}>{createError}</div>
              )}
            </form>
          </div>

          {/* Existing alerts */}
          <div className="sd-card">
            <div className="sd-card-head">
              <h2>Your Alerts ({alertSettings.length})</h2>
            </div>
            {alertSettings.length === 0 ? (
              <div className="al-empty">
                <div>No alerts configured</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                  Create one above to start tracking price changes
                </div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="al-table">
                  <thead>
                    <tr>
                      <th>Commodity</th>
                      <th>City</th>
                      <th>Threshold</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertSettings.map((alert) => (
                      <AlertRow
                        key={alert.id}
                        alert={alert}
                        onUpdate={handleUpdateAlert}
                        onDelete={handleDeleteAlert}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
};

export default Alerts;
