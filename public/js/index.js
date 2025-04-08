/**
 * Temperature Sensor Monitoring System
 * Main JavaScript functionality
 */

// Global variables
// Check if socket already exists, otherwise create it
let socket;
if (!window.socket) {
  socket = io();
  window.socket = socket;
} else {
  socket = window.socket;
}

let isConnected = true;
const INACTIVE_MESSAGES = {
  data: "センサーが未接続のため、データが取得できません。",
  alert: "センサーが未接続のため、アラート情報はありません。",
  settings: "センサーが未接続のため、設定変更履歴は表示できません。",
  personality: "センサーが未接続のため、個性（バイアス）の履歴データは表示できません。"
};

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
  console.log('Initializing temperature sensor monitoring system...');
  
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
  
  // Start connection timestamp interval update
  startTimestampInterval();
  
  // Log connection status
  logger.info('Socket.io initialized, waiting for connection...');
  
  // Get all sensor IDs
  const sensorIds = ['sensor_1', 'sensor_2', 'sensor_3'];
  
  // Refresh data for each sensor
  sensorIds.forEach(sensorId => {
    refreshData(sensorId);
    refreshAlertData(sensorId);
  });

  // Start periodic checks for inactive sensors
  setInterval(checkInactiveSensors, 5000);
});

/**
 * Start interval to update connection timestamp every second
 */
function startTimestampInterval() {
  // Update timestamp immediately
  updateConnectionTimestamp();
  
  // Then update every second
  setInterval(updateConnectionTimestamp, 1000);
}

/**
 * Update only the connection timestamp with current time
 */
function updateConnectionTimestamp() {
  const timestampElement = document.getElementById('connection-timestamp');
  if (timestampElement) {
    timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
  }
}

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

  socket.on('reconnect_attempt', function() {
    showConnecting();
  });
  
  // Initial data load
  socket.on('initialData', function(data) {
    logger.info('Received initial data');
    if (data.sensorData && Array.isArray(data.sensorData)) {
      data.sensorData.forEach(sensorData => {
        updateSensorData(sensorData);
        
        // If sensor is disconnected, clear its alert history
        if (sensorData.status === '未接続' || sensorData.status === 'inactive') {
          setInactiveMessage(sensorData.sensor_id, 'alert');
        }
      });
    }
  });

  // Real-time data updates
  socket.on('newSensorData', function(data) {
    console.log('Received new sensor data');
    console.log('Sensor data details:', data);
    updateSensorData(data);
    
    // If sensor becomes disconnected, clear its alert history
    if (data.status === '未接続' || data.status === 'inactive') {
      setInactiveMessage(data.sensor_id, 'alert');
    }
  });

  socket.on('newAlert', function(data) {
    console.log('Received new alert');
    console.log('Alert details:', data);
    
    // Check if sensor is connected before updating alert data
    const statusElement = document.querySelector(`#sensor-${data.sensor_id} .sensor-status`);
    if (statusElement && !statusElement.classList.contains('inactive') && statusElement.textContent !== '未接続') {
      updateAlertData(data);
    }
  });

  // Server information updates
  socket.on('systemStatus', function(data) {
    updateSystemStatus(data);
  });

  socket.on('personalityComparison', function(data) {
    updatePersonalityComparison(data);
  });

  socket.on('blockchainData', function(data) {
    updateBlockchainData(data);
  });

  socket.on('modelTraining', function(data) {
    updateModelTraining(data);
  });
}

/**
 * Handle UI changes when scrolling for connection status
 */
document.addEventListener('scroll', function() {
  const connectionContainer = document.querySelector('.connection-status-container');
  
  if (connectionContainer) {
    // After scrolling more than 100px, change to compact mode
    if (window.scrollY > 100) {
      connectionContainer.classList.add('scrolling');
    } else {
      connectionContainer.classList.remove('scrolling');
    }
  }
});

/**
 * Update the connection status UI
 */
function updateConnectionStatus(connected) {
  isConnected = connected;
  
  // Update both timestamp and connection status
  const timestampElement = document.getElementById('connection-timestamp');
  const statusValueElement = document.getElementById('connectionStatusValue');
  
  if (timestampElement) {
    timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
  }
  
  if (statusValueElement) {
    // Remove all status classes
    statusValueElement.classList.remove('connected', 'disconnected', 'connecting');
    
    // Update the status text and class
    const statusTextElement = statusValueElement.querySelector('span:last-child');
    
    if (connected) {
      statusValueElement.classList.add('connected');
      if (statusTextElement) statusTextElement.textContent = '接続中';
    } else {
      statusValueElement.classList.add('disconnected');
      if (statusTextElement) statusTextElement.textContent = '切断されました';
      
      // Update inactive messages for all sections if disconnected
      const sensorIds = ['sensor_1', 'sensor_2', 'sensor_3'];
      sensorIds.forEach(sensorId => {
        setInactiveMessage(sensorId, 'data');
        setInactiveMessage(sensorId, 'alert');
        setInactiveMessage(sensorId, 'settings');
        setInactiveMessage(sensorId, 'personality');
      });
    }
  }
  
  // Log connection status change
  logger.info(`Connection status changed: ${connected ? 'Connected' : 'Disconnected'}`);
}

/**
 * Show connecting state during reconnect attempts
 */
function showConnecting() {
  const statusValueElement = document.getElementById('connectionStatusValue');
  
  if (statusValueElement) {
    statusValueElement.classList.remove('connected', 'disconnected');
    statusValueElement.classList.add('connecting');
    
    const statusTextElement = statusValueElement.querySelector('span:last-child');
    if (statusTextElement) statusTextElement.textContent = '再接続中...';
  }
  
  logger.info('Attempting to reconnect to server...');
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
  
  // Apply temperature-warning class if temperature is ≤ 20°C or ≥ 70°C
  if (data.average_temp !== undefined && (data.average_temp <= 20 || data.average_temp >= 70)) {
    newRow.classList.add('temperature-warning');
  }
  
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
  // Show loading indicator
  document.getElementById(`data-last-updated-${sensorId}`).textContent = '読み込み中...';
  
  // Check if the sensor is disconnected first
  const statusElement = document.querySelector(`#sensor-${sensorId} .sensor-status`);
  if (statusElement && (statusElement.textContent === '未接続' || statusElement.classList.contains('inactive'))) {
    // Sensor is disconnected, show inactive message instead of fetching data
    console.log(`Sensor ${sensorId} is disconnected, not fetching data`);
    document.getElementById(`data-last-updated-${sensorId}`).textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
    setInactiveMessage(sensorId, 'data');
    return;
  }
  
  // Fetch sensor data from API
  fetch(`/api/sensors/${sensorId}/readings?limit=10`)
    .then(response => {
      // First check if the response is ok
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Update last updated timestamp
      document.getElementById(`data-last-updated-${sensorId}`).textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
      
      // Get the sensor tbody element
      const sensorTbody = document.getElementById(`tbody-${sensorId}`);
      
      // Clear existing rows
      sensorTbody.innerHTML = '';
      
      // Check if there are any readings
      if (data && data.length > 0) {
        // Loop through readings and add rows
        data.forEach(reading => {
          const row = document.createElement('tr');
          
          // Add temperature-based color coding for temperatures ≤ 20°C or ≥ 70°C
          const avgTemp = reading.temperature || reading.average_temp;
          if (avgTemp <= 20 || avgTemp >= 70) {
            row.classList.add('temperature-warning');
          }
          
          // Add date cell
          const dateCell = document.createElement('td');
          dateCell.textContent = reading.date || formatDate(new Date(reading.timestamp));
          row.appendChild(dateCell);
          
          // Add time cell
          const timeCell = document.createElement('td');
          timeCell.textContent = reading.time || formatTime(new Date(reading.timestamp));
          row.appendChild(timeCell);
          
          // Add temperature cells
          if (reading.temperatureData && reading.temperatureData.length > 0) {
            reading.temperatureData.forEach(temp => {
              const tempCell = document.createElement('td');
              tempCell.textContent = temp.toFixed(1);
              row.appendChild(tempCell);
            });
            
            // Fill in missing cells if less than 16 data points
            for (let i = reading.temperatureData.length; i < 16; i++) {
              const emptyCell = document.createElement('td');
              emptyCell.textContent = '--';
              row.appendChild(emptyCell);
            }
          } else if (reading.temperature_data && reading.temperature_data.length > 0) {
            reading.temperature_data.forEach(temp => {
              const tempCell = document.createElement('td');
              tempCell.textContent = temp.toFixed(1);
              row.appendChild(tempCell);
            });
            
            // Fill in missing cells if less than 16 data points
            for (let i = reading.temperature_data.length; i < 16; i++) {
              const emptyCell = document.createElement('td');
              emptyCell.textContent = '--';
              row.appendChild(emptyCell);
            }
          } else {
            // If no temperature data, show 16 empty cells
            for (let i = 0; i < 16; i++) {
              const emptyCell = document.createElement('td');
              emptyCell.textContent = '--';
              row.appendChild(emptyCell);
            }
          }
          
          // Add average temperature cell
          const avgTempCell = document.createElement('td');
          avgTempCell.textContent = `${avgTemp.toFixed(1)} °C`;
          row.appendChild(avgTempCell);
          
          // Add status cell
          const statusCell = document.createElement('td');
          statusCell.textContent = reading.status.replace('0 ：', '').replace('１：', '');
          row.appendChild(statusCell);
          
          sensorTbody.appendChild(row);
        });
      } else {
        // If no readings, show a message
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 20;
        cell.textContent = 'データがありません';
        cell.className = 'empty-table-row';
        cell.style.textAlign = 'center';
        row.appendChild(cell);
        sensorTbody.appendChild(row);
      }
    })
    .catch(error => {
      console.error('Error fetching sensor data:', error);
      document.getElementById(`data-last-updated-${sensorId}`).textContent = 'データの取得に失敗しました';
    });
}

/**
 * Refresh alert data for a specific sensor
 */
function refreshAlertData(sensorId) {
  // Show loading indicator
  document.getElementById(`alert-last-updated-${sensorId}`).textContent = '読み込み中...';
  
  // Check if the sensor is disconnected first
  const statusElement = document.querySelector(`#sensor-${sensorId} .sensor-status`);
  if (statusElement && (statusElement.textContent === '未接続' || statusElement.classList.contains('inactive'))) {
    // Sensor is disconnected, show inactive message
    console.log(`Sensor ${sensorId} is disconnected, not fetching alert data`);
    document.getElementById(`alert-last-updated-${sensorId}`).textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
    setInactiveMessage(sensorId, 'alert');
    return;
  }
  
  // Fetch alert data from API
  fetch(`/api/alerts/${sensorId}?limit=10`)
    .then(response => response.json())
    .then(data => {
      // Update last updated timestamp
      document.getElementById(`alert-last-updated-${sensorId}`).textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
      
      // Get the alert tbody element
      const alertTbody = document.getElementById(`alert-tbody-${sensorId}`);
      
      // Clear existing rows
      alertTbody.innerHTML = '';
      
      // Check if there are any alerts
      if (data && data.length > 0) {
        // Loop through alerts and add rows
        data.forEach(alert => {
          const row = document.createElement('tr');
          row.className = 'alert-row';
          
          const dateCell = document.createElement('td');
          dateCell.textContent = alert.date || formatDate(new Date(alert.timestamp));
          
          const timeCell = document.createElement('td');
          timeCell.textContent = alert.time || formatTime(new Date(alert.timestamp));
          
          const messageCell = document.createElement('td');
          messageCell.textContent = alert.message;
          
          row.appendChild(dateCell);
          row.appendChild(timeCell);
          row.appendChild(messageCell);
          
          alertTbody.appendChild(row);
        });
      } else {
        // If no alerts and sensor is active (稼働中), show "アラート情報はありません。"
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 3;
        cell.className = 'text-center empty-table-row';
        cell.style.textAlign = 'center';
        
        if (statusElement && statusElement.textContent === '稼働中') {
          cell.textContent = 'アラート情報はありません。';
        } else {
          cell.textContent = 'アラートはありません';
        }
        
        row.appendChild(cell);
        alertTbody.appendChild(row);
      }
    })
    .catch(error => {
      console.error('Error fetching alert data:', error);
      document.getElementById(`alert-last-updated-${sensorId}`).textContent = 'データの取得に失敗しました';
    });
}

// Helper function to format date
function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Helper function to format time
function formatTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
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
  const refreshButton = document.querySelector(`#system-status-section .refresh-btn`);
  if (refreshButton) {
    refreshButton.classList.add('refreshing');
    
    // Simulate refresh with animation
    setTimeout(() => {
      refreshButton.classList.remove('refreshing');
      
      // Update timestamp
      const timestampElement = document.querySelector('#system-status-section .last-updated');
      if (timestampElement) {
        timestampElement.textContent = `最終更新: ${new Date().toLocaleString()}`;
      }

      // Update server uptime
      const uptimeElement = document.getElementById('server-uptime');
      if (uptimeElement) {
        // Increment uptime by 1 minute for demonstration
        const currentUptime = uptimeElement.textContent;
        let hours = parseInt(currentUptime.match(/(\d+)時間/)[1]);
        let minutes = parseInt(currentUptime.match(/(\d+)分/)[1]) + 1;
        
        if (minutes >= 60) {
          hours++;
          minutes = 0;
        }
        
        uptimeElement.textContent = `${hours}時間 ${minutes}分`;
      }
    }, 1000);
    
    // Request fresh data from server
    socket.emit('requestSystemStatus');
    logger.info('Requested system status update');
  }
}

/**
 * Refresh personality comparison data
 */
function refreshPersonalityComparisonData() {
  const refreshButton = document.querySelector(`#personality-comparison-section .refresh-btn`);
  if (refreshButton) {
    refreshButton.classList.add('refreshing');
    
    // Simulate refresh with animation
    setTimeout(() => {
      refreshButton.classList.remove('refreshing');
      
      // Update timestamp
      const timestampElement = document.querySelector('#personality-comparison-section .last-updated');
      if (timestampElement) {
        timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
      }

      // Update data with simulated values
      const tbody = document.getElementById('personality-comparison-tbody');
      if (tbody) {
        // Get all sensor IDs from table
        const sensorIds = [];
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
          const sensorCell = row.querySelector('td:nth-child(3)');
          if (sensorCell) {
            const sensorId = sensorCell.textContent;
            if (!sensorIds.includes(sensorId)) {
              sensorIds.push(sensorId);
            }
          }
        });

        // Generate updated data for each sensor
        if (sensorIds.length > 0) {
          tbody.innerHTML = '';
          
          sensorIds.forEach(sensorId => {
            const row = document.createElement('tr');
            const today = new Date();
            
            const variation = (Math.random() * 2).toFixed(2);
            const pattern = ["ランダム変動", "規則的変動", "単調増加", "単調減少"][Math.floor(Math.random() * 4)];
            const trend = ["安定", "上昇傾向", "下降傾向", "周期的"][Math.floor(Math.random() * 4)];
            
            row.innerHTML = `
              <td>${today.toLocaleDateString()}</td>
              <td>${today.toLocaleTimeString()}</td>
              <td>${sensorId}</td>
              <td>${variation}</td>
              <td>${parseFloat(variation) > 1.5 ? "注意: 高い個性" : "通常範囲内の個性"}</td>
              <td>${pattern}</td>
              <td>${trend}</td>
            `;
            
            tbody.appendChild(row);
          });
        }
      }
    }, 1000);
    
    // Request fresh data from server
    socket.emit('requestPersonalityComparison');
    logger.info('Requested personality comparison update');
  }
}

/**
 * Refresh blockchain/IPFS data
 */
function refreshBlockchainData() {
  const refreshButton = document.querySelector(`#blockchain-ipfs-section .refresh-btn`);
  if (refreshButton) {
    refreshButton.classList.add('refreshing');
    
    // Simulate refresh with animation
    setTimeout(() => {
      refreshButton.classList.remove('refreshing');
      
      // Update timestamp
      const timestampElement = document.querySelector('#blockchain-ipfs-section .last-updated');
      if (timestampElement) {
        timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
      }

      // Update one random row with new status
      const tbody = document.getElementById('blockchain-ipfs-tbody');
      if (tbody && tbody.children.length > 0) {
        const randomRowIndex = Math.floor(Math.random() * tbody.children.length);
        const randomRow = tbody.children[randomRowIndex];
        
        // Update the status cell
        const statusCell = randomRow.querySelector('td:last-child');
        if (statusCell) {
          // Cycle through statuses
          if (statusCell.classList.contains('status-completed')) {
            statusCell.classList.remove('status-completed');
            statusCell.classList.add('status-pending');
            statusCell.textContent = '処理中';
          } else if (statusCell.classList.contains('status-pending')) {
            statusCell.classList.remove('status-pending');
            statusCell.classList.add('status-failed');
            statusCell.textContent = 'エラー';
          } else {
            statusCell.classList.remove('status-failed');
            statusCell.classList.add('status-completed');
            statusCell.textContent = '完了';
          }
        }

        // Update the date and time
        const dateCell = randomRow.querySelector('td:first-child');
        const timeCell = randomRow.querySelector('td:nth-child(2)');
        if (dateCell && timeCell) {
          const now = new Date();
          dateCell.textContent = now.toLocaleDateString();
          timeCell.textContent = now.toLocaleTimeString();
        }
      }
    }, 1000);
    
    // Request fresh data from server
    socket.emit('requestBlockchainData');
    logger.info('Requested blockchain data update');
  }
}

/**
 * Refresh model training data
 */
function refreshModelTrainingData() {
  const refreshButton = document.querySelector(`#model-training-section .refresh-btn`);
  if (refreshButton) {
    refreshButton.classList.add('refreshing');
    
    // Simulate refresh with animation
    setTimeout(() => {
      refreshButton.classList.remove('refreshing');
      
      // Update timestamp
      const timestampElement = document.querySelector('#model-training-section .last-updated');
      if (timestampElement) {
        timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
      }

      // Update progress
      const progressBar = document.querySelector('#model-training-section .progress-bar');
      const progressText = document.querySelector('#model-training-section .progress-text');
      if (progressBar && progressText) {
        let currentProgress = parseInt(progressBar.style.width) || 65;
        currentProgress += 5;
        
        if (currentProgress > 100) {
          currentProgress = 100;
          progressText.textContent = '完了';
        } else {
          progressBar.style.width = `${currentProgress}%`;
          progressText.textContent = `${currentProgress}% 完了`;
        }
      }

      // Update remaining time
      const timeDisplay = document.querySelector('#model-training-section .model-stat-item:last-child .stat-value');
      if (timeDisplay) {
        const timeParts = timeDisplay.textContent.split(':').map(Number);
        let minutes = timeParts[0];
        let seconds = timeParts[1];
        
        // Decrease time by 30 seconds
        seconds -= 30;
        if (seconds < 0) {
          seconds += 60;
          minutes -= 1;
        }
        
        if (minutes < 0) {
          timeDisplay.textContent = '00:00:00';
        } else {
          timeDisplay.textContent = `00:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
      }

      // Update data points
      const dataPointsDisplay = document.querySelector('#model-training-section .model-stat-item:first-child .stat-value');
      if (dataPointsDisplay) {
        let currentPoints = parseInt(dataPointsDisplay.textContent.replace(/,/g, ''));
        currentPoints += 150;
        dataPointsDisplay.textContent = currentPoints.toLocaleString();
      }

      // Update epochs
      const epochsDisplay = document.querySelector('#model-training-section .model-stat-item:nth-child(2) .stat-value');
      if (epochsDisplay) {
        const epochParts = epochsDisplay.textContent.split('/');
        let current = parseInt(epochParts[0]);
        let total = parseInt(epochParts[1]);
        
        current += 1;
        if (current > total) {
          current = total;
        }
        
        epochsDisplay.textContent = `${current}/${total}`;
      }
    }, 1000);
    
    // Request fresh data from server
    socket.emit('requestModelTraining');
    logger.info('Requested model training data update');
  }
}

/**
 * Update system status data
 */
function updateSystemStatus(data) {
  if (!data) return;
  
  // Update MongoDB connection status
  const mongoStatus = document.querySelector('.status-item:nth-child(1) .status-value');
  if (mongoStatus) {
    mongoStatus.innerHTML = `
      <span class="status-indicator ${data.mongoConnected ? 'status-connected' : 'status-disconnected'}"></span>
      <span>${data.mongoConnected ? '接続中' : '未接続'}</span>
    `;
  }

  // Update active sensors count
  const sensorsCount = document.querySelector('.status-item:nth-child(2) .status-value');
  if (sensorsCount) {
    sensorsCount.textContent = data.activeSensors || '0';
  }

  // Update CPU usage
  const cpuUsage = document.querySelector('.status-item:nth-child(6) .status-value');
  if (cpuUsage) {
    cpuUsage.textContent = `${data.cpuUsage || '0'}%`;
  }

  // Update memory usage
  const memoryUsage = document.querySelector('.status-item:nth-child(7) .status-value');
  if (memoryUsage) {
    memoryUsage.textContent = `${data.memoryUsage || '0'}%`;
  }
}

/**
 * Update personality comparison data
 */
function updatePersonalityComparison(data) {
  if (!data || !Array.isArray(data)) return;
  
  const tbody = document.getElementById('personality-comparison-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  
  data.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.date}</td>
      <td>${item.time}</td>
      <td>${item.sensorId}</td>
      <td>${item.variation}</td>
      <td>${parseFloat(item.variation) > 1.5 ? "注意: 高い個性" : "通常範囲内の個性"}</td>
      <td>${item.pattern}</td>
      <td>${item.trend}</td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Update blockchain/IPFS data
 */
function updateBlockchainData(data) {
  if (!data || !Array.isArray(data)) return;
  
  const tbody = document.getElementById('blockchain-ipfs-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  
  data.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.date}</td>
      <td>${item.time}</td>
      <td>${item.modelId}</td>
      <td>${item.sensorId}</td>
      <td class="ipfs-cid"><a href="#" target="_blank">${item.ipfsCid}</a></td>
      <td class="blockchain-tx"><a href="#" target="_blank">${item.transactionHash}</a></td>
      <td class="status-${item.status.toLowerCase()}">${item.status}</td>
    `;
    tbody.appendChild(row);
  });
}

/**
 * Update model training data
 */
function updateModelTraining(data) {
  if (!data) return;
  
  // Update progress bar
  const progressBar = document.querySelector('#model-training-section .progress-bar');
  const progressText = document.querySelector('#model-training-section .progress-text');
  if (progressBar && progressText) {
    progressBar.style.width = `${data.progress}%`;
    progressText.textContent = `${data.progress}% 完了`;
  }

  // Update stats
  const dataPoints = document.querySelector('#model-training-section .model-stat-item:nth-child(1) .stat-value');
  if (dataPoints) {
    dataPoints.textContent = data.dataPoints.toLocaleString();
  }

  const epochs = document.querySelector('#model-training-section .model-stat-item:nth-child(2) .stat-value');
  if (epochs) {
    epochs.textContent = `${data.currentEpoch}/${data.totalEpochs}`;
  }

  const timeRemaining = document.querySelector('#model-training-section .model-stat-item:nth-child(3) .stat-value');
  if (timeRemaining) {
    timeRemaining.textContent = data.estimatedTimeRemaining;
  }

  // Update training history
  const tbody = document.getElementById('model-training-tbody');
  if (tbody && data.history && Array.isArray(data.history)) {
    tbody.innerHTML = '';
    
    data.history.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.date}</td>
        <td>${item.version}</td>
        <td>${item.accuracy}%</td>
        <td>${item.loss}</td>
        <td>${item.dataPoints.toLocaleString()}</td>
        <td>${item.duration}</td>
      `;
      tbody.appendChild(row);
    });
  }
}

/**
 * Set the appropriate inactive message for a specific section
 */
function setInactiveMessage(sensorId, section) {
  // Log the received data for debugging purposes
  console.log(`Setting inactive message for sensor ${sensorId}, section: ${section}`);
  
  // Get the appropriate table body or container based on section
  let container;
  
  switch (section) {
    case 'data':
      container = document.getElementById(`tbody-${sensorId}`);
      break;
    case 'alert':
      container = document.getElementById(`alert-tbody-${sensorId}`);
      break;
    case 'settings':
      container = document.getElementById(`settings-${sensorId}`);
      break;
    case 'personality':
      container = document.getElementById(`personality-${sensorId}`);
      break;
    default:
      return;
  }
  
  if (container) {
    // Clear existing content
    container.innerHTML = '';
    
    // Create a new empty row with message
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    
    // Set colspan based on section
    cell.setAttribute('colspan', (section === 'data') ? 20 : 3);
    cell.className = 'text-center empty-table-row';
    cell.style.textAlign = 'center';
    
    // Set the inactive message based on section
    cell.textContent = INACTIVE_MESSAGES[section];
    
    row.appendChild(cell);
    container.appendChild(row);
    
    // Log that the message was displayed
    console.log(`Displayed inactive message for ${sensorId}, ${section}: ${INACTIVE_MESSAGES[section]}`);
  }
}
