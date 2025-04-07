/**
 * Temperature Sensor Monitoring System
 * Main JavaScript functionality
 */

// Global variables
// Check if socket already exists, otherwise create it
const socket = window.socket || io();
let isConnected = true;
const INACTIVE_MESSAGES = {
  data: "センサーが未接続のため、データが取得できません。",
  alert: "アラート情報はありません。",
  settings: "設定変更履歴は表示できません。",
  personality: "個性（バイアス）の履歴データは表示できません。"
};

// Make socket globally available for logger
window.socket = socket;

/**
 * Store and retrieve active tab information to/from localStorage
 */
function saveActiveTab(tabId) {
  localStorage.setItem('activeTab', tabId);
  localStorage.setItem('activeTabTimestamp', new Date().getTime());
}

function getActiveTab() {
  const tabId = localStorage.getItem('activeTab') || 'sensorTab';
  const timestamp = parseInt(localStorage.getItem('activeTabTimestamp') || '0');
  const now = new Date().getTime();
  
  // If stored more than 30 minutes ago, ignore it
  if (now - timestamp > 30 * 60 * 1000) {
    return 'sensorTab'; // Default to sensor tab
  }
  
  return tabId;
}

/**
 * Initialize the application when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
  logger.info('Initializing temperature sensor monitoring system...');
  
  // Load the user's last active tab from localStorage
  const activeTabId = getActiveTab();
  const activeTabBtn = document.getElementById(`${activeTabId.replace('Tab', '')}TabBtn`);

  // Set the active tab
  if (activeTabBtn) {
    switchTab(activeTabId, activeTabBtn);
  } else {
    // If no stored tab or the stored tab doesn't exist anymore, set the first tab as active
    const defaultTabBtn = document.getElementById('sensorTabBtn');
    if (defaultTabBtn) {
      defaultTabBtn.classList.add('active');
      document.getElementById('sensorTab').classList.add('active');
    }
  }

  // Setup socket event listeners
  setupSocketListeners();
  
  // Log connection status
  logger.info('Socket.io initialized, waiting for connection...');
});

/**
 * Setup all Socket.io event listeners
 */
function setupSocketListeners() {
  // Connection events
  socket.on('connect', function() {
    logger.info('Connected to server');
    updateConnectionStatus(true);
  });

  socket.on('disconnect', function() {
    logger.warn('Disconnected from server');
    updateConnectionStatus(false);
  });
  
  // Initial data load
  socket.on('initialData', function(data) {
    logger.info('Received initial data');
    if (data.sensorData && Array.isArray(data.sensorData)) {
      data.sensorData.forEach(sensorData => {
        updateSensorData(sensorData);
      });
    }
    
    if (data.alerts && Array.isArray(data.alerts)) {
      data.alerts.forEach(alert => {
        updateAlertData(alert);
      });
    }
  });

  // Real-time data updates
  socket.on('newSensorData', function(data) {
    logger.info('Received new sensor data');
    logger.debug('Sensor data details:', data);
    updateSensorData(data);
  });

  socket.on('newAlert', function(data) {
    logger.info('Received new alert');
    logger.debug('Alert details:', data);
    updateAlertData(data);
  });
}

/**
 * Update the connection status UI
 */
function updateConnectionStatus(connected) {
  isConnected = connected;
  const statusElement = document.getElementById('connectionStatus');
  
  if (statusElement) {
    if (connected) {
      statusElement.className = 'connection-status connected';
      statusElement.textContent = 'サーバーに接続中';
    } else {
      statusElement.className = 'connection-status disconnected';
      statusElement.textContent = 'サーバーから切断されました';
    }
  }
}

/**
 * Switch between tabs and save the active tab
 */
function switchTab(tabId, button) {
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active class from all tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show the selected tab content
  const selectedTab = document.getElementById(tabId);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
  
  // Add active class to the clicked button
  if (button) {
    button.classList.add('active');
  }
  
  // Save the active tab to localStorage
  saveActiveTab(tabId);
}

/**
 * Update sensor data in the UI
 */
function updateSensorData(data) {
  if (!data || !data.sensor_id) return;
  
  const sensorId = data.sensor_id;
  
  // Update timestamp
  const timestampElement = document.getElementById(`data-last-updated-${sensorId}`);
  if (timestampElement) {
    timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
  }
  
  // Update status indicator if needed
  updateSensorStatus(sensorId, data.status);
  
  // Add new row to the table
  const tbody = document.getElementById(`tbody-${sensorId}`);
  if (tbody) {
    // Remove any "no data" message
    const emptyRow = tbody.querySelector('.empty-row');
    if (emptyRow) {
      tbody.removeChild(emptyRow);
    }
    
    // Create new row with the sensor data
    const newRow = createSensorDataRow(data);
    
    // Insert at the beginning of the table
    if (tbody.firstChild) {
      tbody.insertBefore(newRow, tbody.firstChild);
    } else {
      tbody.appendChild(newRow);
    }
  }
}

/**
 * Update sensor status indicator
 */
function updateSensorStatus(sensorId, status) {
  const statusElement = document.querySelector(`#sensor-${sensorId} .sensor-status`);
  if (statusElement) {
    // Check explicitly for 'inactive' or '未接続' or empty/null status
    if (status === 'inactive' || status === '未接続' || !status) {
      // Set to inactive state
      statusElement.className = 'sensor-status inactive';
      statusElement.textContent = '未接続';
      
      logger.info(`Sensor ${sensorId} is not connected, setting inactive messages`);
      
      // Set proper inactive messages for all sections
      setInactiveMessage(sensorId, 'data');
      setInactiveMessage(sensorId, 'alert');
      setInactiveMessage(sensorId, 'settings');
      setInactiveMessage(sensorId, 'personality');
    } else {
      const isNormal = status.includes('正常');
      statusElement.className = `sensor-status ${isNormal ? 'active' : 'alert'}`;
      statusElement.textContent = isNormal ? '稼働中' : '異常検出';
    }
  }
}

/**
 * Create a table row for sensor data
 */
function createSensorDataRow(data) {
  const newRow = document.createElement('tr');
  newRow.className = 'new-data';
  
  // Create date cell
  const dateCell = document.createElement('td');
  dateCell.textContent = data.date;
  newRow.appendChild(dateCell);
  
  // Create time cell
  const timeCell = document.createElement('td');
  timeCell.textContent = data.time;
  newRow.appendChild(timeCell);
  
  // Create temperature data cells
  if (data.temperature_data && Array.isArray(data.temperature_data)) {
    data.temperature_data.forEach(temp => {
      const tempCell = document.createElement('td');
      tempCell.textContent = temp;
      newRow.appendChild(tempCell);
    });
    
    // Fill remaining cells if needed
    const expectedCells = 16; // 16 temperature readings
    if (data.temperature_data.length < expectedCells) {
      for (let i = data.temperature_data.length; i < expectedCells; i++) {
        const emptyCell = document.createElement('td');
        emptyCell.textContent = '-';
        newRow.appendChild(emptyCell);
      }
    }
  }
  
  // Create average temperature cell
  const avgTempCell = document.createElement('td');
  avgTempCell.textContent = data.average_temp ? data.average_temp.toFixed(2) : '-';
  newRow.appendChild(avgTempCell);
  
  // Create status cell
  const statusCell = document.createElement('td');
  statusCell.textContent = data.status || '-';
  if (data.status && !data.status.includes('正常')) {
    statusCell.classList.add('table-danger');
  }
  newRow.appendChild(statusCell);
  
  return newRow;
}

/**
 * Update alert data in the UI
 */
function updateAlertData(alert) {
  if (!alert || !alert.sensor_id) return;
  
  const sensorId = alert.sensor_id;
  
  // Update timestamp
  const timestampElement = document.getElementById(`alert-last-updated-${sensorId}`);
  if (timestampElement) {
    timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
  }
  
  // Add new alert to the table
  const tbody = document.getElementById(`alert-tbody-${sensorId}`);
  if (tbody) {
    // Remove any "no alerts" message
    const emptyRow = tbody.querySelector('tr td[colspan="3"]');
    if (emptyRow) {
      tbody.innerHTML = '';
    }
    
    // Create new row with the alert data
    const newRow = document.createElement('tr');
    newRow.className = 'alert-row';
    
    // Create date cell
    const dateCell = document.createElement('td');
    dateCell.textContent = alert.date;
    newRow.appendChild(dateCell);
    
    // Create time cell
    const timeCell = document.createElement('td');
    timeCell.textContent = alert.time;
    newRow.appendChild(timeCell);
    
    // Create message cell
    const messageCell = document.createElement('td');
    messageCell.textContent = alert.message || alert.alert_reason || '異常を検出しました';
    newRow.appendChild(messageCell);
    
    // Insert at the beginning of the table
    if (tbody.firstChild) {
      tbody.insertBefore(newRow, tbody.firstChild);
    } else {
      tbody.appendChild(newRow);
    }
    
    // Highlight the sensor section
    const sensorSection = document.getElementById(`sensor-${sensorId}`);
    if (sensorSection) {
      sensorSection.classList.add('has-new-alert');
      setTimeout(() => {
        sensorSection.classList.remove('has-new-alert');
      }, 2000);
    }
  }
}

/**
 * Format sensor data for display
 */
function formatSensorData(data) {
  if (!data) return null;
  
  return {
    sensorId: data.sensor_id,
    date: data.date,
    time: data.time,
    temperatureData: data.temperature_data,
    averageTemp: data.average_temp,
    status: data.status,
    timestamp: data.created_at || new Date()
  };
}

/**
 * Refresh data for a specific sensor
 */
function refreshData(sensorId) {
  const refreshButton = document.querySelector(`button[onclick="refreshData('${sensorId}')"]`);
  if (refreshButton) {
    refreshButton.classList.add('refreshing');
    
    // Simulate refresh with animation
    setTimeout(() => {
      refreshButton.classList.remove('refreshing');
    }, 1000);
    
    // Request fresh data from server
    socket.emit('requestData', { sensorId });
  }
}

/**
 * Refresh alert data for a specific sensor
 */
function refreshAlertData(sensorId) {
  const refreshButton = document.querySelector(`button[onclick="refreshAlertData('${sensorId}')"]`);
  if (refreshButton) {
    refreshButton.classList.add('refreshing');
    
    // Simulate refresh with animation
    setTimeout(() => {
      refreshButton.classList.remove('refreshing');
    }, 1000);
    
    // Request fresh alert data from server
    socket.emit('requestAlerts', { sensorId });
  }
}

/**
 * Refresh settings data for a specific sensor
 */
function refreshSettingsData(sensorId) {
  const refreshButton = document.querySelector(`button[onclick="refreshSettingsData('${sensorId}')"]`);
  if (refreshButton) {
    refreshButton.classList.add('refreshing');
    
    // Simulate refresh with animation
    setTimeout(() => {
      refreshButton.classList.remove('refreshing');
    }, 1000);
    
    // Request fresh settings data from server
    socket.emit('requestSettings', { sensorId });
  }
}

/**
 * Refresh personality data for a specific sensor
 */
function refreshPersonalityData(sensorId) {
  const refreshButton = document.querySelector(`button[onclick="refreshPersonalityData('${sensorId}')"]`);
  if (refreshButton) {
    refreshButton.classList.add('refreshing');
    
    // Simulate refresh with animation
    setTimeout(() => {
      refreshButton.classList.remove('refreshing');
    }, 1000);
    
    // Request fresh personality data from server
    socket.emit('requestPersonality', { sensorId });
  }
}

/**
 * Refresh system status data
 */
function refreshSystemStatus() {
  const refreshButton = document.querySelector(`.system-status .refresh-btn`);
  if (refreshButton) {
    refreshButton.classList.add('refreshing');
    
    // Simulate refresh with animation
    setTimeout(() => {
      refreshButton.classList.remove('refreshing');
      
      // Update timestamp
      const timestampElement = document.querySelector('.system-status .last-updated');
      if (timestampElement) {
        timestampElement.textContent = `最終更新: ${new Date().toLocaleString()}`;
      }
    }, 1000);
    
    // Request fresh data from server
    socket.emit('requestSystemStatus');
  }
}

/**
 * Refresh model education data
 */
function refreshModelEducation() {
  const refreshButton = document.querySelector(`.model-update-education .refresh-btn`);
  if (refreshButton) {
    refreshButton.classList.add('refreshing');
    
    // Simulate refresh with animation
    setTimeout(() => {
      refreshButton.classList.remove('refreshing');
      
      // Update timestamp
      const timestampElement = document.querySelector('.model-update-education .last-updated');
      if (timestampElement) {
        timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
      }
    }, 1000);
    
    // Request fresh data from server
    socket.emit('requestModelEducation');
  }
}

/**
 * Refresh personality comparison data
 */
function refreshPersonalityComparison() {
  const refreshButton = document.querySelector(`.personality-comparison .refresh-btn`);
  if (refreshButton) {
    refreshButton.classList.add('refreshing');
    
    // Simulate refresh with animation
    setTimeout(() => {
      refreshButton.classList.remove('refreshing');
      
      // Update timestamp
      const timestampElement = document.querySelector('.personality-comparison .last-updated');
      if (timestampElement) {
        timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
      }
    }, 1000);
    
    // Request fresh data from server
    socket.emit('requestPersonalityComparison');
  }
}

/**
 * Refresh blockchain/IPFS data
 */
function refreshBlockchainData() {
  const refreshButton = document.querySelector(`.blockchain-ipfs .refresh-btn`);
  if (refreshButton) {
    refreshButton.classList.add('refreshing');
    
    // Simulate refresh with animation
    setTimeout(() => {
      refreshButton.classList.remove('refreshing');
      
      // Update timestamp
      const timestampElement = document.querySelector('.blockchain-ipfs .last-updated');
      if (timestampElement) {
        timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
      }
    }, 1000);
    
    // Request fresh data from server
    socket.emit('requestBlockchainData');
  }
}

/**
 * Set the appropriate inactive message for a specific section
 */
function setInactiveMessage(sensorId, section) {
  let tbody;
  
  switch(section) {
    case 'data':
      tbody = document.getElementById(`tbody-${sensorId}`);
      break;
    case 'alert':
      tbody = document.getElementById(`alert-tbody-${sensorId}`);
      break;
    case 'settings':
      tbody = document.getElementById(`settings-${sensorId}`);
      break;
    case 'personality':
      tbody = document.getElementById(`personality-${sensorId}`);
      break;
  }
  
  if (tbody) {
    // Clear any existing content
    tbody.innerHTML = '';
    
    // Create empty row with message
    const emptyRow = document.createElement('tr');
    const messageCell = document.createElement('td');
    messageCell.setAttribute('colspan', section === 'data' ? '20' : '3');
    messageCell.className = 'text-center';
    messageCell.textContent = INACTIVE_MESSAGES[section];
    emptyRow.appendChild(messageCell);
    
    if (section === 'data') {
      emptyRow.className = 'empty-row';
    }
    
    tbody.appendChild(emptyRow);
  }
}
