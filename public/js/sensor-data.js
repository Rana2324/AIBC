// Socket.io connection
const socket = io();

// Global variables
let activeTab = 'sensorTab';
let isConnected = true;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  // Set the first tab as active by default
  const defaultTabBtn = document.getElementById('sensorTabBtn');
  if (defaultTabBtn) {
    defaultTabBtn.classList.add('active');
    document.getElementById('sensorTab').classList.add('active');
  }

  // Setup socket event listeners
  setupSocketListeners();
  
  // Log connection status
  console.log('Socket.io initialized, waiting for connection...');
});

// Setup Socket.io event listeners
function setupSocketListeners() {
  // Connection events
  socket.on('connect', function() {
    console.log('Connected to server');
    updateConnectionStatus(true);
  });

  socket.on('disconnect', function() {
    console.log('Disconnected from server');
    updateConnectionStatus(false);
  });

  // Data events
  socket.on('newSensorData', function(data) {
    console.log('Received new sensor data:', data);
    updateSensorData(data);
  });

  socket.on('newAlert', function(data) {
    console.log('Received new alert:', data);
    updateAlertData(data);
  });
}

// Update connection status UI
function updateConnectionStatus(connected) {
  isConnected = connected;
  const statusElement = document.getElementById('connectionStatus');
  
  if (statusElement) {
    statusElement.className = connected ? 'connection-status connected' : 'connection-status disconnected';
    statusElement.textContent = connected ? 'サーバーに接続中' : 'サーバーから切断されました';
  }

  // Update realtime indicators
  const indicators = document.querySelectorAll('.realtime-indicator');
  indicators.forEach(indicator => {
    indicator.classList.toggle('active', connected);
  });
}

// Switch between tabs
function switchTab(tabId, button) {
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
  
  // Update active tab
  activeTab = tabId;
}

// Update sensor data in the UI
function updateSensorData(data) {
  // Format the data
  const formattedData = formatSensorData(data);
  
  // Get the sensor ID
  const sensorId = formattedData.sensorId;
  
  console.log(`Updating UI for sensor ${sensorId}`);
  
  // Check if the sensor section exists
  let sensorSection = document.getElementById(`sensor-${sensorId}`);
  
  if (!sensorSection) {
    console.log(`Sensor section for ${sensorId} not found, reloading page`);
    // If this is a new sensor, we need to refresh the page to show it
    // In a more advanced implementation, we would dynamically create the section
    location.reload();
    return;
  }
  
  // If it's a placeholder, convert it to active sensor
  if (sensorSection.classList.contains('sensor-placeholder')) {
    console.log(`Sensor ${sensorId} is a placeholder, reloading page`);
    location.reload();
    return;
  }
  
  // Update the table data
  const tbody = document.getElementById(`tbody-${sensorId}`);
  if (tbody) {
    console.log(`Found tbody for sensor ${sensorId}, adding new row`);
    // Create a new row for the data
    const row = createSensorDataRow(formattedData);
    
    // Add the row to the top of the table
    if (tbody.firstChild) {
      tbody.insertBefore(row, tbody.firstChild);
    } else {
      tbody.appendChild(row);
    }
    
    // Highlight the new row
    row.classList.add('new-data');
    setTimeout(() => {
      row.classList.remove('new-data');
    }, 3000);
    
    // Update last updated timestamp
    const lastUpdated = document.getElementById(`data-last-updated-${sensorId}`);
    if (lastUpdated) {
      lastUpdated.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
    }
    
    // Update sensor status if needed
    updateSensorStatus(sensorId, formattedData.status);
  } else {
    console.log(`Tbody for sensor ${sensorId} not found`);
  }
}

// Update sensor status indicator
function updateSensorStatus(sensorId, status) {
  const statusElement = document.querySelector(`#sensor-${sensorId} .sensor-status`);
  if (statusElement) {
    const isNormal = status.includes('正常');
    statusElement.className = `sensor-status ${isNormal ? 'active' : 'alert'}`;
    statusElement.textContent = isNormal ? '稼働中' : '異常検出';
    statusElement.classList.add('status-changed');
    setTimeout(() => {
      statusElement.classList.remove('status-changed');
    }, 2000);
  }
}

// Create a table row for sensor data
function createSensorDataRow(data) {
  const row = document.createElement('tr');
  
  // Add class for alert status
  if (!data.status.includes('正常')) {
    row.classList.add('table-danger');
  }
  
  // Add date and time
  row.innerHTML = `
    <td>${data.date}</td>
    <td>${data.time}</td>
  `;
  
  // Add temperature data points
  if (data.temperatureData && data.temperatureData.length > 0) {
    data.temperatureData.forEach(temp => {
      const td = document.createElement('td');
      td.textContent = parseFloat(temp).toFixed(1);
      row.appendChild(td);
    });
    
    // Fill in missing cells if less than 16 data points
    for (let i = data.temperatureData.length; i < 16; i++) {
      const td = document.createElement('td');
      td.textContent = '--';
      row.appendChild(td);
    }
  } else {
    // If no temperature data, show 16 empty cells
    for (let i = 0; i < 16; i++) {
      const td = document.createElement('td');
      td.textContent = '--';
      row.appendChild(td);
    }
  }
  
  // Add average temperature and status
  const tempTd = document.createElement('td');
  tempTd.textContent = `${parseFloat(data.temperature).toFixed(1)} °C`;
  row.appendChild(tempTd);
  
  const statusTd = document.createElement('td');
  statusTd.textContent = data.status.replace('0 ：', '').replace('１：', '');
  row.appendChild(statusTd);
  
  return row;
}

// Update alert data in the UI
function updateAlertData(data) {
  // Get the sensor ID
  const sensorId = data.sensorId;
  
  // Find the alert table for this sensor
  const alertTable = document.querySelector(`#sensor-${sensorId} .alert-table table tbody`);
  
  if (alertTable) {
    // Create a new row for the alert
    const row = document.createElement('tr');
    row.classList.add('alert-row');
    
    // Add the alert data
    row.innerHTML = `
      <td>${new Date(data.timestamp).toLocaleDateString()}</td>
      <td>${new Date(data.timestamp).toLocaleTimeString()}</td>
      <td>${data.message}</td>
    `;
    
    // Add the row to the top of the table
    if (alertTable.firstChild) {
      alertTable.insertBefore(row, alertTable.firstChild);
    } else {
      alertTable.appendChild(row);
    }
    
    // Remove "no alerts" message if it exists
    const noAlertsRow = alertTable.querySelector('tr td[colspan="3"]');
    if (noAlertsRow) {
      alertTable.removeChild(noAlertsRow.parentNode);
    }
    
    // Update last updated timestamp
    const lastUpdated = document.getElementById(`alert-last-updated-${sensorId}`);
    if (lastUpdated) {
      lastUpdated.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
    }
  }
}

// Format sensor data for display
function formatSensorData(data) {
  return {
    sensorId: data.sensor_id,
    date: data.date,
    time: data.time,
    temperatureData: data.temperature_data,
    temperature: data.average_temp,
    status: data.status,
    timestamp: data.created_at || new Date().getTime()
  };
}

// Refresh data for a specific sensor
function refreshData(sensorId) {
  // In a real implementation, this would request fresh data from the server
  // For now, we'll just show a loading indicator
  const lastUpdated = document.getElementById(`data-last-updated-${sensorId}`);
  if (lastUpdated) {
    lastUpdated.textContent = '読み込み中...';
    
    // Simulate a delay and then restore the text
    setTimeout(() => {
      lastUpdated.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
    }, 1000);
  }
}

// Refresh alert data for a specific sensor
function refreshAlertData(sensorId) {
  // Similar to refreshData, this would request fresh alert data
  const lastUpdated = document.getElementById(`alert-last-updated-${sensorId}`);
  if (lastUpdated) {
    lastUpdated.textContent = '読み込み中...';
    
    // Simulate a delay and then restore the text
    setTimeout(() => {
      lastUpdated.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
    }, 1000);
  }
}
