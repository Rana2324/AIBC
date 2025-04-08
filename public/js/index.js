/**
 * Temperature Sensor Monitoring System
 * Main JavaScript functionality with modular organization
 */

// ===================================================
// Module: Core Application
// ===================================================
const SensorApp = (function() {
  // Private variables
  let socket;
  let isConnected = true;
  
  // Constants
  const INACTIVE_MESSAGES = {
    data: "センサーが未接続のため、データが取得できません。",
    alert: "アラート情報はありません。",
    settings: "設定変更履歴は表示できません。",
    personality: "個性（バイアス）の履歴データは表示できません。"
  };
  
  // Initialize the application
  const init = function() {
    console.log('Initializing temperature sensor monitoring system...');
    
    // Setup socket connection
    initSocket();
    
    // Set active tab from localStorage
    setActiveTabFromStorage();
    
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
    
    // Setup scroll handler for connection status
    setupScrollHandler();
  };
  
  // Initialize socket connection
  const initSocket = function() {
    // Check if socket already exists, otherwise create it
    if (!window.socket) {
      socket = io();
      window.socket = socket;
    } else {
      socket = window.socket;
    }
    
    // Setup all Socket.io event listeners
    setupSocketListeners();
  };
  
  // Set active tab from localStorage
  const setActiveTabFromStorage = function() {
    const activeTabId = UIManager.getActiveTab();
    const activeTabBtn = document.getElementById(`${activeTabId.replace('Tab', '')}TabBtn`);

    // Set the active tab
    if (activeTabBtn) {
      UIManager.switchTab(activeTabId, activeTabBtn);
    } else {
      // If no stored tab or the stored tab doesn't exist, set the first tab as active
      const defaultTabBtn = document.getElementById('sensorTabBtn');
      if (defaultTabBtn) {
        defaultTabBtn.classList.add('active');
        document.getElementById('sensorTab').classList.add('active');
      }
    }
  };
  
  // Start interval to update connection timestamp every second
  const startTimestampInterval = function() {
    // Update timestamp immediately
    UIManager.updateConnectionTimestamp();
    
    // Then update every second
    setInterval(UIManager.updateConnectionTimestamp, 1000);
  };
  
  // Setup scroll handler for connection status
  const setupScrollHandler = function() {
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
  };
  
  // Check for inactive sensors
  const checkInactiveSensors = function() {
    // Get all sensor status elements
    const statusElements = document.querySelectorAll('.sensor-status');
    
    // Check each sensor
    statusElements.forEach(statusElement => {
      const sensorId = statusElement.closest('[id^="sensor-"]').id.replace('sensor-', '');
      
      // If sensor is inactive, set appropriate messages
      if (statusElement.classList.contains('inactive') || statusElement.textContent === '未接続') {
        UIManager.setInactiveMessage(sensorId, 'data');
        UIManager.setInactiveMessage(sensorId, 'alert');
        UIManager.setInactiveMessage(sensorId, 'settings');
        UIManager.setInactiveMessage(sensorId, 'personality');
      }
    });
  };
  
  // Setup all Socket.io event listeners
  const setupSocketListeners = function() {
    // Connection events
    socket.on('connect', function() {
      logger.info('Connected to server');
      UIManager.updateConnectionStatus(true);
    });

    socket.on('disconnect', function() {
      logger.warn('Disconnected from server');
      UIManager.updateConnectionStatus(false);
    });

    socket.on('reconnect_attempt', function() {
      UIManager.showConnecting();
    });
    
    // Initial data load
    socket.on('initialData', function(data) {
      logger.info('Received initial data');
      if (data.sensorData && Array.isArray(data.sensorData)) {
        data.sensorData.forEach(sensorData => {
          UIManager.updateSensorData(sensorData);
          
          // If sensor is disconnected, clear its alert history
          if (sensorData.status === '未接続' || sensorData.status === 'inactive') {
            UIManager.setInactiveMessage(sensorData.sensor_id, 'alert');
          }
        });
      }
    });

    // Real-time data updates
    socket.on('newSensorData', function(data) {
      console.log('Received new sensor data');
      UIManager.updateSensorData(data);
      
      // If sensor becomes disconnected, clear its alert history
      if (data.status === '未接続' || data.status === 'inactive') {
        UIManager.setInactiveMessage(data.sensor_id, 'alert');
      }
    });

    socket.on('newAlert', function(data) {
      console.log('Received new alert');
      
      // Check if sensor is connected before updating alert data
      const statusElement = document.querySelector(`#sensor-${data.sensor_id} .sensor-status`);
      if (statusElement && !statusElement.classList.contains('inactive') && statusElement.textContent !== '未接続') {
        UIManager.updateAlertData(data);
      }
    });

    // Server information updates
    socket.on('systemStatus', function(data) {
      UIManager.updateSystemStatus(data);
    });

    socket.on('personalityComparison', function(data) {
      UIManager.updatePersonalityComparison(data);
    });

    socket.on('blockchainData', function(data) {
      UIManager.updateBlockchainData(data);
    });

    socket.on('modelTraining', function(data) {
      UIManager.updateModelTraining(data);
    });
    
    socket.on('error', function(errorData) {
      logger.error('Socket error:', errorData);
      UIManager.showError(errorData.message || 'An error occurred');
    });
  };
  
  // Public methods
  return {
    init: init,
    refreshData: function(sensorId) {
      DataService.refreshSensorData(sensorId);
    },
    refreshAlertData: function(sensorId) {
      DataService.refreshAlertData(sensorId);
    },
    refreshSystemStatus: function() {
      DataService.refreshSystemStatus(socket);
    },
    refreshSettingsData: function(sensorId) {
      DataService.refreshSettingsData(sensorId, socket);
    },
    refreshPersonalityData: function(sensorId) {
      DataService.refreshPersonalityData(sensorId, socket);
    },
    getSocket: function() {
      return socket;
    }
  };
})();

// ===================================================
// Module: UI Manager
// ===================================================
const UIManager = (function() {
  // Store and retrieve active tab information to/from localStorage
  const saveActiveTab = function(tabId) {
    localStorage.setItem('activeTab', tabId);
    localStorage.setItem('activeTabTimestamp', new Date().getTime());
  };

  const getActiveTab = function() {
    const tabId = localStorage.getItem('activeTab') || 'sensorTab';
    const timestamp = parseInt(localStorage.getItem('activeTabTimestamp') || '0');
    const now = new Date().getTime();
    
    // If stored more than 30 minutes ago, ignore it
    if (now - timestamp > 30 * 60 * 1000) {
      return 'sensorTab'; // Default to sensor tab
    }
    
    return tabId;
  };
  
  /**
   * Update only the connection timestamp with current time
   */
  const updateConnectionTimestamp = function() {
    const timestampElement = document.getElementById('connection-timestamp');
    if (timestampElement) {
      timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
    }
  };
  
  /**
   * Show connecting state during reconnect attempts
   */
  const showConnecting = function() {
    const statusValueElement = document.getElementById('connectionStatusValue');
    
    if (statusValueElement) {
      statusValueElement.classList.remove('connected', 'disconnected');
      statusValueElement.classList.add('connecting');
      
      const statusTextElement = statusValueElement.querySelector('span:last-child');
      if (statusTextElement) statusTextElement.textContent = '再接続中...';
    }
    
    logger.info('Attempting to reconnect to server...');
  };
  
  /**
   * Update the connection status UI
   */
  const updateConnectionStatus = function(connected) {
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
  };
  
  /**
   * Switch between tabs and save the active tab
   */
  const switchTab = function(tabId, button) {
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
  };

  /**
   * Update sensor data in the UI
   */
  const updateSensorData = function(data) {
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
  };

  /**
   * Update sensor status indicator
   */
  const updateSensorStatus = function(sensorId, status) {
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
  };

  /**
   * Create a table row for sensor data
   */
  const createSensorDataRow = function(data) {
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
  };

  /**
   * Update alert data in the UI
   */
  const updateAlertData = function(alert) {
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
  };

  /**
   * Update system status data in the UI
   */
  const updateSystemStatus = function(data) {
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
  };

  /**
   * Set the appropriate inactive message for a specific section
   */
  const setInactiveMessage = function(sensorId, section) {
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
      const INACTIVE_MESSAGES = {
        data: "センサーが未接続のため、データが取得できません。",
        alert: "アラート情報はありません。",
        settings: "設定変更履歴は表示できません。",
        personality: "個性（バイアス）の履歴データは表示できません。"
      };
      
      cell.textContent = INACTIVE_MESSAGES[section];
      
      row.appendChild(cell);
      container.appendChild(row);
      
      // Log that the message was displayed
      console.log(`Displayed inactive message for ${sensorId}, ${section}: ${INACTIVE_MESSAGES[section]}`);
    }
  };
  
  /**
   * Show error notification
   */
  const showError = function(message) {
    // Create error notification
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.innerHTML = `
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-message">${message}</span>
        <button class="error-close">×</button>
      </div>
    `;
    
    // Add close button functionality
    notification.querySelector('.error-close').addEventListener('click', function() {
      document.body.removeChild(notification);
    });
    
    // Add to document and auto-remove after 5 seconds
    document.body.appendChild(notification);
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  };
  
  return {
    updateConnectionTimestamp: updateConnectionTimestamp,
    showConnecting: showConnecting,
    updateConnectionStatus: updateConnectionStatus,
    switchTab: switchTab,
    updateSensorData: updateSensorData,
    updateSensorStatus: updateSensorStatus,
    updateAlertData: updateAlertData,
    updateSystemStatus: updateSystemStatus,
    setInactiveMessage: setInactiveMessage,
    showError: showError,
    getActiveTab: getActiveTab
  };
})();

// ===================================================
// Module: Data Service
// ===================================================
const DataService = (function() {
  /**
   * Format date to YYYY-MM-DD
   */
  const formatDate = function(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  /**
   * Format time to HH:MM:SS
   */
  const formatTime = function(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  };
  
  /**
   * Refresh data for a specific sensor
   */
  const refreshSensorData = function(sensorId) {
    // Show loading indicator
    document.getElementById(`data-last-updated-${sensorId}`).textContent = '読み込み中...';
    
    // Check if the sensor is disconnected first
    const statusElement = document.querySelector(`#sensor-${sensorId} .sensor-status`);
    if (statusElement && (statusElement.textContent === '未接続' || statusElement.classList.contains('inactive'))) {
      // Sensor is disconnected, show inactive message instead of fetching data
      console.log(`Sensor ${sensorId} is disconnected, not fetching data`);
      document.getElementById(`data-last-updated-${sensorId}`).textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
      UIManager.setInactiveMessage(sensorId, 'data');
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
        if (data && data.data && data.data.length > 0) {
          // Loop through readings and add rows
          data.data.forEach(reading => {
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
        UIManager.showError('センサーデータの取得に失敗しました');
      });
  };

  /**
   * Refresh alert data for a specific sensor
   */
  const refreshAlertData = function(sensorId) {
    // Show loading indicator
    document.getElementById(`alert-last-updated-${sensorId}`).textContent = '読み込み中...';
    
    // Check if the sensor is disconnected first
    const statusElement = document.querySelector(`#sensor-${sensorId} .sensor-status`);
    if (statusElement && (statusElement.textContent === '未接続' || statusElement.classList.contains('inactive'))) {
      // Sensor is disconnected, show inactive message
      console.log(`Sensor ${sensorId} is disconnected, not fetching alert data`);
      document.getElementById(`alert-last-updated-${sensorId}`).textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
      UIManager.setInactiveMessage(sensorId, 'alert');
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
  };

  /**
   * Refresh system status data
   */
  const refreshSystemStatus = function(socket) {
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
      }, 1000);
      
      // Request fresh data from server
      socket.emit('requestSystemStatus');
      logger.info('Requested system status update');
    }
  };
  
  /**
   * Refresh settings data for a specific sensor
   */
  const refreshSettingsData = function(sensorId, socket) {
    const refreshButton = document.querySelector(`button[onclick="SensorApp.refreshSettingsData('${sensorId}')"]`);
    if (refreshButton) {
      refreshButton.classList.add('refreshing');
      
      // Simulate refresh with animation
      setTimeout(() => {
        refreshButton.classList.remove('refreshing');
      }, 1000);
      
      // Request fresh settings data from server
      socket.emit('requestSettings', { sensorId });
    }
  };
  
  /**
   * Refresh personality data for a specific sensor
   */
  const refreshPersonalityData = function(sensorId, socket) {
    const refreshButton = document.querySelector(`button[onclick="SensorApp.refreshPersonalityData('${sensorId}')"]`);
    if (refreshButton) {
      refreshButton.classList.add('refreshing');
      
      // Simulate refresh with animation
      setTimeout(() => {
        refreshButton.classList.remove('refreshing');
      }, 1000);
      
      // Request fresh personality data from server
      socket.emit('requestPersonality', { sensorId });
    }
  };
  
  return {
    refreshSensorData: refreshSensorData,
    refreshAlertData: refreshAlertData,
    refreshSystemStatus: refreshSystemStatus,
    refreshSettingsData: refreshSettingsData,
    refreshPersonalityData: refreshPersonalityData,
    formatDate: formatDate,
    formatTime: formatTime
  };
})();

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', SensorApp.init);

// Expose functions for global use from HTML elements
window.refreshData = SensorApp.refreshData;
window.refreshAlertData = SensorApp.refreshAlertData;
window.refreshSettingsData = SensorApp.refreshSettingsData;
window.refreshPersonalityData = SensorApp.refreshPersonalityData;
window.refreshSystemStatus = SensorApp.refreshSystemStatus;
window.switchTab = UIManager.switchTab; // Add this line to expose switchTab to the global scope
