/**
 * UI Utility Functions
 * Centralized UI-related utility functions for the client-side
 */

/**
 * Format date to YYYY-MM-DD
 * @param {Date|string} date - Date object or date string
 * @returns {string} - Formatted date string
 */
export const formatDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * Format time to HH:MM:SS
 * @param {Date|string} date - Date object or date string
 * @returns {string} - Formatted time string
 */
export const formatTime = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return d.toTimeString().split(' ')[0];
};

/**
 * Format a full timestamp
 * @param {Date|string} date - Date object or date string
 * @returns {string} - Formatted timestamp string
 */
export const formatTimestamp = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${formatDate(d)} ${formatTime(d)}`;
};

/**
 * Get a relative time string (e.g., "5 minutes ago")
 * @param {Date|string} date - Date object or date string
 * @returns {string} - Relative time string
 */
export const getRelativeTimeString = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now - d;
  
  // Convert to seconds
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) {
    return `${diffSec}秒前`;
  }
  
  // Convert to minutes
  const diffMin = Math.floor(diffSec / 60);
  
  if (diffMin < 60) {
    return `${diffMin}分前`;
  }
  
  // Convert to hours
  const diffHour = Math.floor(diffMin / 60);
  
  if (diffHour < 24) {
    return `${diffHour}時間前`;
  }
  
  // Convert to days
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay < 30) {
    return `${diffDay}日前`;
  }
  
  // Convert to months
  const diffMonth = Math.floor(diffDay / 30);
  
  if (diffMonth < 12) {
    return `${diffMonth}ヶ月前`;
  }
  
  // Convert to years
  const diffYear = Math.floor(diffMonth / 12);
  return `${diffYear}年前`;
};

/**
 * Create a table row for sensor data
 * @param {Object} data - Sensor data object
 * @returns {HTMLTableRowElement} - Table row element
 */
export const createSensorDataRow = (data) => {
  const tr = document.createElement('tr');
  
  // Apply table-danger class to the entire row if temperature is out of range
  if (data.average_temp <= 20 || data.average_temp >= 70) {
    tr.classList.add('table-danger');
  }
  
  // Create date cell
  const dateCell = document.createElement('td');
  dateCell.textContent = data.date;
  tr.appendChild(dateCell);
  
  // Create time cell
  const timeCell = document.createElement('td');
  timeCell.textContent = data.time;
  tr.appendChild(timeCell);
  
  // Create temperature data cells
  if (data.temperature_data && Array.isArray(data.temperature_data)) {
    data.temperature_data.forEach(temp => {
      const tempCell = document.createElement('td');
      tempCell.textContent = typeof temp === 'number' ? temp.toFixed(1) : '--';
      tr.appendChild(tempCell);
    });
    
    // Fill in missing cells if less than 16 data points
    for (let i = data.temperature_data.length; i < 16; i++) {
      const emptyCell = document.createElement('td');
      emptyCell.textContent = '--';
      tr.appendChild(emptyCell);
    }
  } else {
    // If no temperature data, show 16 empty cells
    for (let i = 0; i < 16; i++) {
      const emptyCell = document.createElement('td');
      emptyCell.textContent = '--';
      tr.appendChild(emptyCell);
    }
  }
  
  // Create average temperature cell
  const avgTempCell = document.createElement('td');
  avgTempCell.textContent = `${data.average_temp.toFixed(1)} °C`;
  tr.appendChild(avgTempCell);
  
  // Create status cell
  const statusCell = document.createElement('td');
  statusCell.textContent = data.status.replace('0 ：', '').replace('１：', '');
  tr.appendChild(statusCell);
  
  return tr;
};

/**
 * Create an alert row
 * @param {Object} alert - Alert data object
 * @returns {HTMLTableRowElement} - Table row element
 */
export const createAlertRow = (alert) => {
  const tr = document.createElement('tr');
  tr.classList.add('alert-row');
  
  // Create date cell
  const dateCell = document.createElement('td');
  dateCell.textContent = alert.date;
  tr.appendChild(dateCell);
  
  // Create time cell
  const timeCell = document.createElement('td');
  timeCell.textContent = alert.time;
  tr.appendChild(timeCell);
  
  // Create message cell
  const messageCell = document.createElement('td');
  messageCell.textContent = alert.message || alert.alert_reason;
  tr.appendChild(messageCell);
  
  return tr;
};

/**
 * Show error notification
 * @param {string} message - Error message
 */
export const showError = (message) => {
  // Check if the same error is already displayed
  const existingErrors = document.querySelectorAll('.error-notification');
  for (const error of existingErrors) {
    if (error.querySelector('.error-message').textContent === message) {
      // Don't show duplicate errors
      return;
    }
  }
  
  // Create error notification element
  const errorNotification = document.createElement('div');
  errorNotification.classList.add('error-notification');
  
  // Create error icon
  const errorIcon = document.createElement('span');
  errorIcon.classList.add('error-icon');
  errorIcon.textContent = '⚠️';
  errorNotification.appendChild(errorIcon);
  
  // Create error message
  const errorMessage = document.createElement('span');
  errorMessage.classList.add('error-message');
  errorMessage.textContent = message;
  errorNotification.appendChild(errorMessage);
  
  // Create close button
  const closeButton = document.createElement('button');
  closeButton.classList.add('error-close');
  closeButton.textContent = '×';
  closeButton.addEventListener('click', () => {
    errorNotification.classList.add('closing');
    setTimeout(() => {
      errorNotification.remove();
    }, 300);
  });
  errorNotification.appendChild(closeButton);
  
  // Add to document
  document.body.appendChild(errorNotification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (document.body.contains(errorNotification)) {
      errorNotification.classList.add('closing');
      setTimeout(() => {
        if (document.body.contains(errorNotification)) {
          errorNotification.remove();
        }
      }, 300);
    }
  }, 5000);
};

/**
 * Set inactive message for a specific section
 * @param {string} sensorId - Sensor ID
 * @param {string} section - Section name (data, alert, settings, personality)
 */
export const setInactiveMessage = (sensorId, section) => {
  const INACTIVE_MESSAGES = {
    data: "センサーが未接続のため、データが取得できません。",
    alert: "アラート情報はありません。",
    settings: "設定変更履歴は表示できません。",
    personality: "個性（バイアス）の履歴データは表示できません。"
  };
  
  let targetElement;
  
  switch (section) {
    case 'data':
      targetElement = document.getElementById(`tbody-${sensorId}`);
      break;
    case 'alert':
      targetElement = document.getElementById(`alert-tbody-${sensorId}`);
      break;
    case 'settings':
      targetElement = document.getElementById(`settings-${sensorId}`);
      break;
    case 'personality':
      targetElement = document.getElementById(`personality-${sensorId}`);
      break;
    default:
      return;
  }
  
  if (targetElement) {
    // Clear existing content
    targetElement.innerHTML = '';
    
    // Create empty row with message
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.setAttribute('colspan', section === 'data' ? '19' : '3');
    td.classList.add('text-center');
    td.textContent = INACTIVE_MESSAGES[section];
    tr.appendChild(td);
    targetElement.appendChild(tr);
  }
};

/**
 * Update sensor status indicator
 * @param {string} sensorId - Sensor ID
 * @param {string} status - Status text
 */
export const updateSensorStatus = (sensorId, status) => {
  const statusElement = document.querySelector(`#sensor-${sensorId} .sensor-status`);
  
  if (statusElement) {
    // Remove existing status classes
    statusElement.classList.remove('active', 'alert', 'inactive');
    
    // Set text content
    statusElement.textContent = status;
    
    // Add appropriate class based on status
    if (status === '稼働中') {
      statusElement.classList.add('active');
    } else if (status === '未接続') {
      statusElement.classList.add('inactive');
      
      // Set inactive messages for all sections
      setInactiveMessage(sensorId, 'data');
      setInactiveMessage(sensorId, 'alert');
      setInactiveMessage(sensorId, 'settings');
      setInactiveMessage(sensorId, 'personality');
    } else {
      statusElement.classList.add('alert');
    }
  }
};

/**
 * Switch between tabs
 * @param {string} tabId - Tab ID
 * @param {HTMLElement} button - Button element
 */
export const switchTab = (tabId, button) => {
  // Hide all tabs
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.classList.remove('active'));
  
  // Deactivate all buttons
  const buttons = document.querySelectorAll('.tab-button');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  // Show the selected tab
  const selectedTab = document.getElementById(tabId);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
  
  // Activate the clicked button
  if (button) {
    button.classList.add('active');
  }
  
  // Save the active tab in local storage
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('activeTab', tabId);
  }
  
  // Dispatch custom event that tab changed
  window.dispatchEvent(new CustomEvent('tabChanged', { 
    detail: { tabId, button } 
  }));
};

/**
 * Get the active tab from localStorage
 * @returns {string} - The ID of the active tab or default tab ID
 */
export const getActiveTab = () => {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('activeTab') || 'sensorTab';
  }
  return 'sensorTab'; // Default tab
};

/**
 * Update connection status UI
 * @param {boolean} connected - Whether connected to server
 */
export const updateConnectionStatus = (connected) => {
  const statusContainer = document.querySelector('.connection-status');
  const statusText = document.querySelector('.connection-status-text');
  const statusIcon = document.querySelector('.connection-status-icon');
  
  if (!statusContainer || !statusText || !statusIcon) {
    return;
  }
  
  // Update connection timestamp
  updateConnectionTimestamp();
  
  // Remove existing status classes
  statusContainer.classList.remove('connected', 'disconnected', 'connecting');
  
  if (connected) {
    // Update for connected state
    statusContainer.classList.add('connected');
    statusText.textContent = '接続済み';
    statusIcon.textContent = '●';
  } else {
    // Update for disconnected state
    statusContainer.classList.add('disconnected');
    statusText.textContent = '未接続';
    statusIcon.textContent = '○';
    
    // Show error notification
    showError('サーバーとの接続が切断されました。再接続を試みています...');
  }
};

/**
 * Update connection timestamp with current time
 */
export const updateConnectionTimestamp = () => {
  const timestampElement = document.querySelector('.connection-timestamp');
  
  if (timestampElement) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    timestampElement.textContent = `${hours}:${minutes}:${seconds}`;
  }
};

export default {
  formatDate,
  formatTime,
  formatTimestamp,
  getRelativeTimeString,
  createSensorDataRow,
  createAlertRow,
  showError,
  setInactiveMessage,
  updateSensorStatus,
  switchTab,
  getActiveTab,
  updateConnectionStatus,
  updateConnectionTimestamp
};
