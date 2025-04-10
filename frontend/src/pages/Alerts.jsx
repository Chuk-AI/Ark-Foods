import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from "../components/userContext";
import Header from '../components/header';
import axios from 'axios';
import '../styles/alerts.css';

const Alerts = () => {
  const { isAuthenticated } = useContext(UserContext);
  
  // States for alert settings
  const [commodities, setCommodities] = useState([]);
  const [alertSettings, setAlertSettings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // State for new alert form
  const [newAlert, setNewAlert] = useState({
    commodity: '',
    city:'Boston',
    threshold: 5, // Default to 5%
    isActive: true
  });
  
  // Tab state
  const [activeTab, setActiveTab] = useState('notifications');

  // Fetch commodities, user's alert settings, and notifications on component mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchCommodities();
      fetchAlertSettings();
      fetchNotifications();
    }
  }, [isAuthenticated]);

  // Update unread count when notifications change
  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
    
    // Update notification badge in header
    if (window.updateNotificationBadge) {
      window.updateNotificationBadge(count);
    }
  }, [notifications]);

  // Fetch available commodities from API
  const fetchCommodities = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('/api/commodities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCommodities(response.data);
    } catch (error) {
      console.error('Error fetching commodities:', error);
    }
  };

  // Fetch user's alert settings
  const fetchAlertSettings = async () => {
    try {
      console.log('Fetching alert settings at:', new Date().toISOString());
      
      const token = localStorage.getItem('authToken');
      const response = await axios.get('/api/alert-entries-fresh', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        params: {
          _: new Date().getTime()  // Add timestamp to force new request
        }
      });
      
      console.log('Received alert settings:', response.data);
      setAlertSettings(response.data);
    } catch (error) {
      console.error('Error fetching alert settings:', error);
      console.error('Error details:', error.response?.data);
    }
  };
  
  // Fetch user notifications
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Handle creating a new alert setting
  const handleCreateAlert = async (e) => {
    e.preventDefault();
    try {
        const token = localStorage.getItem('authToken');
      const response = await axios.post('/api/alert-settings', newAlert, {
        headers: { Authorization: `Bearer ${token}` } // Use token from your app's context or elsewhere
      });
  
      // Add the new alert to the list
      setAlertSettings([...alertSettings, response.data]);
  
      // Reset form
      setNewAlert({
        commodity: '',
        city: 'Boston',
        threshold: 5,
        isActive: true
      });
    } catch (error) {
      console.error('Error creating alert:', error);
      alert('Failed to create alert. Please try again.');
    }
  };
  
  // Handle updating an existing alert setting
  const handleUpdateAlert = async (id, updates) => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.patch(`/api/alert-settings/${id}`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setAlertSettings(alertSettings.map(alert => 
        alert.id === id ? { ...alert, ...updates } : alert
      ));
      
    } catch (error) {
      console.error('Error updating alert:', error);
      alert('Failed to update alert. Please try again.');
    }
  };

// Add console logging to see what's being sent
const handleDeleteAlert = async (alertItem) => {
    if (window.confirm('Are you sure you want to delete this alert?')) {
      try {
        console.log("Deleting alert for commodity:", alertItem.id);
        
        const token = localStorage.getItem('authToken');
        
        // Use the commodity-based endpoint
        const response = await axios.post('/api/delete-alert-by-id', {
          id: alertItem.id
        }, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        });
        
        console.log("Delete response:", response.data);
        
        // Remove this item from the local state
        setAlertSettings(alertSettings.filter(
          alert => alert.id !== alertItem.id
        ));
        
      } catch (error) {
        console.error('Error deleting alert:', error);
        window.alert('Failed to delete alert: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  // Mark a notification as read
  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.patch(`/api/notifications/${id}`, { read: true }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setNotifications(notifications.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      ));
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`/api/notifications/mark-all-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setNotifications(notifications.map(notif => ({ ...notif, read: true })));
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Delete a notification
  const deleteNotification = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setNotifications(notifications.filter(notif => notif.id !== id));
      
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewAlert({
      ...newAlert,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  return (
    <div>
      <Header />
      <div className="container mt-5 pt-4">
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header bg-primary text-white">
                <h2>Price Alert System</h2>
                <ul className="nav nav-tabs card-header-tabs mt-2">
                  <li className="nav-item">
                    <button 
                      className={`nav-link ${activeTab === 'notifications' ? 'active text-primary' : 'text-white'}`}
                      onClick={() => setActiveTab('notifications')}
                    >
                      Notifications
                      {unreadCount > 0 && (
                        <span className="badge bg-danger ms-2">{unreadCount}</span>
                      )}
                    </button>
                  </li>
                  <li className="nav-item">
                    <button 
                      className={`nav-link ${activeTab === 'settings' ? 'active text-primary' : 'text-white'}`}
                      onClick={() => setActiveTab('settings')}
                    >
                      Alert Settings
                    </button>
                  </li>
                </ul>
              </div>
              <div className="card-body">
                {activeTab === 'notifications' ? (
                  <div id="notifications-tab">
                    <div className="d-flex justify-content-between mb-3">
                      <h3>Price Alerts</h3>
                      {notifications.length > 0 && (
                        <button className="btn btn-outline-secondary" onClick={markAllAsRead}>
                          Mark All as Read
                        </button>
                      )}
                    </div>
                    
                    {notifications.length === 0 ? (
                      <div className="alert alert-info">
                        You don't have any price alerts yet. They will appear here when commodity prices cross your set thresholds.
                      </div>
                    ) : (
                      <div className="notification-list">
                        {notifications.map(notification => (
                          <div 
                            key={notification.id} 
                            className={`notification-item ${notification.read ? '' : 'unread'}`}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="notification-content">
                              <div className="notification-header">
                                <h5 className="notification-title">
                                  <span className="badge bg-danger me-2">Price Alert</span>
                                  {notification.title}
                                </h5>
                                <div className="notification-actions">
                                  <button 
                                    className="btn btn-sm btn-outline-danger" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification(notification.id);
                                    }}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </div>
                              </div>
                              <p className="notification-message">{notification.message}</p>
                              <div className="notification-meta">
                                <small className="text-muted">{formatDate(notification.created_at)}</small>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div id="settings-tab">
                    <h3 className="mb-3">Alert Settings</h3>
                    
                    <div className="create-alert-form mb-4">
                      <h4>Create New Price Alert</h4>
                      <form onSubmit={handleCreateAlert}>
                        <div className="row g-3">
                          <div className="col-md-3">
                            <label htmlFor="commodity" className="form-label">Commodity</label>
                            <select 
                              className="form-select" 
                              id="commodity"
                              name="commodity"
                              value={newAlert.commodity}
                              onChange={handleInputChange}
                              required
                            >
                              <option value="">Select a commodity</option>
                              {commodities.map(commodity => (
                                <option key={commodity} value={commodity}>{commodity}</option>
                              ))}
                            </select>
                          </div>
                                <div className="col-md-3">
                                <label htmlFor="city" className="form-label">City</label>
                                <select 
                                    className="form-select" 
                                    id="city"
                                    name="city"
                                    value={newAlert.city}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select a city</option>
                                    <option value="Baltimore">Baltimore</option>
                                    <option value="Boston">Boston</option>
                                    <option value="Chicago">Chicago</option>
                                    <option value="Columbia">Columbia</option>
                                    <option value="Los Angeles">Los Angeles</option>
                                    <option value="Miami">Miami</option>
                                    <option value="New York">New York</option>
                                    <option value="Philadelphia">Philadelphia</option>
                         
                                </select>
                                </div>
                          <div className="col-md-3">
                            <label htmlFor="threshold" className="form-label">Price Increase Threshold (%)</label>
                            <input 
                              type="number" 
                              className="form-control" 
                              id="threshold"
                              name="threshold"
                              min="1"
                              max="100"
                              value={newAlert.threshold}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                          <div className="col-md-3 d-flex align-items-end">
                            <button type="submit" className="btn btn-primary w-100">
                              Create Alert
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                    
                    <h4>Your Price Alerts</h4>
                    {alertSettings.length === 0 ? (
                      <div className="alert alert-info">
                        You haven't set up any price alerts yet. Create one using the form above.
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead>
                            <tr>
                              <th>Commodity</th>
                              <th>City</th>
                              <th>Threshold (%)</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {alertSettings.map(alert => (
                              <tr key={alert.id}>
                                <td>{alert.commodity}</td>
                                <td>{alert.city}</td>
                                <td>
                                  <div className="input-group input-group-sm">
                                    <input 
                                      type="number" 
                                      className="form-control" 
                                      value={alert.threshold}
                                      onChange={(e) => handleUpdateAlert(alert.id, { threshold: e.target.value })}
                                      min="1"
                                      max="100"
                                    />
                                    <span className="input-group-text">%</span>
                                  </div>
                                </td>
                                <td>
                                  <div className="form-check form-switch">
                                    <input 
                                      className="form-check-input" 
                                      type="checkbox" 
                                      checked={alert.isActive}
                                      onChange={(e) => handleUpdateAlert(alert.id, { isActive: e.target.checked })}
                                    />
                                    <label className="form-check-label">
                                      {alert.isActive ? 'Active' : 'Paused'}
                                    </label>
                                  </div>
                                </td>
                                <td>
                                  <button 
                                    className="btn btn-sm btn-outline-danger" 
                                    onClick={() => handleDeleteAlert(alert)}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alerts;