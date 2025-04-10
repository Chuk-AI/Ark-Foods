// Add this to a utility file or directly in your Header component

import axios from 'axios';

/**
 * Fetches the unread notification count and updates the badge in the header
 */
export const updateNotificationCount = async () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    const response = await axios.get('/api/notifications/unread-count', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const count = response.data.count;
    
    // Find the notification badge element
    const badge = document.querySelector('.notification-badge');
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
    
    return count;
  } catch (error) {
    console.error('Error updating notification count:', error);
    return 0;
  }
};

// Make this function available globally for the scheduler to call
window.updateNotificationBadge = (count) => {
  const badge = document.querySelector('.notification-badge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
};

// Set up polling to check for new notifications periodically
export const startNotificationPolling = (intervalMs = 60000) => {
  // Initial check
  updateNotificationCount();
  
  // Then check periodically
  const intervalId = setInterval(updateNotificationCount, intervalMs);
  
  // Return the interval ID so it can be cleared if needed
  return intervalId;
};