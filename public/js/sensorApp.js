/**
 * SensorApp Module
 * Core application functionality for the temperature sensor monitoring system
 */
import api from './apiService.js';
import uiUtils from './uiUtils.js';
import dataService from './dataService.js';

// Global temperature warning thresholds
const TEMP_WARNING_LOW = 20;
const TEMP_WARNING_HIGH = 70;

// SensorApp module using IIFE pattern
const SensorApp = (function() {
  // Private variables
  let socket;
  let isConnected = true;
  
  // Sensor activity tracking
  const sensorLastActivity = {
    sensor_1: 0,
    sensor_2: 0,
    sensor_3: 0
  };
  
  // Configuration
  const SENSOR_INACTIVE_THRESHOLD = 1000; // Mark as inactive after 1 second of no data
  
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
    console.info('Socket.io initialized, waiting for connection...');
    
    // Get all sensor IDs
    const sensorIds = ['sensor_1', 'sensor_2', 'sensor_3'];
    
    // Refresh data for each sensor
    sensorIds.forEach(sensorId => {
      refreshData(sensorId);
      refreshAlertData(sensorId);
    });

    // Start periodic checks for inactive sensors (check every 500ms for faster detection)
    setInterval(checkInactiveSensors, 500);
    
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
    const activeTabId = uiUtils.getActiveTab();
    const activeTabBtn = document.getElementById(`${activeTabId.replace('Tab', '')}TabBtn`);

    // Set the active tab
    if (activeTabBtn) {
      uiUtils.switchTab(activeTabId, activeTabBtn);
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
    uiUtils.updateConnectionTimestamp();
    
    // Then update every second
    setInterval(uiUtils.updateConnectionTimestamp, 1000);
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
    // Get current timestamp
    const now = Date.now();
    
    // For each sensor, check if it's been inactive for longer than the threshold
    Object.keys(sensorLastActivity).forEach(sensorId => {
      // Skip sensors with no activity recorded yet (value is 0)
      if (sensorLastActivity[sensorId] === 0) return;
      
      const inactiveTime = now - sensorLastActivity[sensorId];
      const statusElement = document.querySelector(`#sensor-${sensorId} .sensor-status`);
      
      // If inactive for more than threshold and currently shown as active
      if (inactiveTime > SENSOR_INACTIVE_THRESHOLD && 
          statusElement && 
          statusElement.textContent === '稼働中') {
        
        // Log the status change
        console.info(`Sensor ${sensorId} marked as inactive (no data for ${inactiveTime}ms)`);
        
        // Change status to inactive
        uiUtils.updateSensorStatus(sensorId, '未接続');
        
        // Show notification
        uiUtils.showError(`センサー ${sensorId} が未接続になりました`);
      }
    });
  };
  
  // Setup all Socket.io event listeners
  const setupSocketListeners = function() {
    // Connection events
    socket.on('connect', function() {
      uiUtils.updateConnectionStatus(true);
    });

    socket.on('disconnect', function() {
      console.warn('Disconnected from server');
      uiUtils.updateConnectionStatus(false);
    });

    socket.on('reconnect_attempt', function() {
      showConnecting();
    });
    
    // Initial data load
    socket.on('initialData', function(data) {
      if (data.sensorData && Array.isArray(data.sensorData)) {
        data.sensorData.forEach(sensorData => {
          updateSensorData(sensorData);
          
          // If sensor is disconnected, clear its alert history
          if (sensorData.status === '未接続' || sensorData.status === 'inactive') {
            uiUtils.setInactiveMessage(sensorData.sensor_id, 'alert');
          }
        });
      }
    });

    // Real-time data updates
    socket.on('newSensorData', function(data) {
      console.log('Received new sensor data');
      
      // Update last activity time for this sensor
      if (data && data.sensor_id) {
        updateSensorActivity(data.sensor_id);
      }
      
      updateSensorData(data);
      
      // If sensor becomes disconnected, clear its alert history
      if (data.status === '未接続' || data.status === 'inactive') {
        uiUtils.setInactiveMessage(data.sensor_id, 'alert');
      }
    });
    
    // Alert events
    socket.on('newAlert', function(alert) {
      console.log('Received new alert', alert);
      updateAlertData(alert);
    });
    
    // Error events
    socket.on('error', function(error) {
      console.error('Socket error:', error);
      uiUtils.showError(`エラー: ${error.message || '不明なエラー'}`);
    });
    
    // System status updates
    socket.on('systemStatus', function(data) {
      console.log('Received system status update', data);
      updateSystemStatus(data);
    });
  };
  
  // Update sensor data in the UI
  const updateSensorData = function(data) {
    // Skip if data is missing essential properties
    if (!data || !data.sensor_id) {
      console.warn('Received invalid sensor data', data);
      return;
    }
    
    // Update sensor status based on data
    const statusText = data.status.includes('正常') ? '稼働中' : '異常検出';
    uiUtils.updateSensorStatus(data.sensor_id, statusText);
    
    // Get the sensor tbody element
    const sensorTbody = document.getElementById(`tbody-${data.sensor_id}`);
    if (!sensorTbody) {
      console.warn(`Element with ID tbody-${data.sensor_id} not found`);
      return;
    }
    
    // Create a new row for the data
    const row = uiUtils.createSensorDataRow(data);
    
    // Add the row to the table (at the top)
    if (sensorTbody.firstChild) {
      sensorTbody.insertBefore(row, sensorTbody.firstChild);
    } else {
      sensorTbody.appendChild(row);
    }
    
    // Limit the number of rows to 10
    while (sensorTbody.children.length > 10) {
      sensorTbody.removeChild(sensorTbody.lastChild);
    }
    
    // Update last updated timestamp
    const timestampElement = document.getElementById(`data-last-updated-${data.sensor_id}`);
    if (timestampElement) {
      timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
    }
  };
  
  // Update alert data in the UI
  const updateAlertData = function(alert) {
    // Skip if alert is missing essential properties
    if (!alert || !alert.sensor_id) {
      console.warn('Received invalid alert data', alert);
      return;
    }
    
    // Get the alert tbody element
    const alertTbody = document.getElementById(`alert-tbody-${alert.sensor_id}`);
    if (!alertTbody) {
      console.warn(`Element with ID alert-tbody-${alert.sensor_id} not found`);
      return;
    }
    
    // Check if this is a duplicate alert (same message in the last row)
    const lastRow = alertTbody.firstChild;
    if (lastRow && lastRow.cells && lastRow.cells.length >= 3) {
      const lastMessage = lastRow.cells[2].textContent;
      if (lastMessage === (alert.message || alert.alert_reason)) {
        // This is a duplicate alert, don't add it
        console.log('Duplicate alert, not adding to UI', alert);
        return;
      }
    }
    
    // Create a new row for the alert
    const row = uiUtils.createAlertRow(alert);
    
    // Add the row to the table (at the top)
    if (alertTbody.firstChild) {
      alertTbody.insertBefore(row, alertTbody.firstChild);
    } else {
      alertTbody.appendChild(row);
    }
    
    // Limit the number of rows to 10
    while (alertTbody.children.length > 10) {
      alertTbody.removeChild(alertTbody.lastChild);
    }
    
    // Update last updated timestamp
    const timestampElement = document.getElementById(`alert-last-updated-${alert.sensor_id}`);
    if (timestampElement) {
      timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
    }
    
    // Show notification
    uiUtils.showError(`アラート: ${alert.message || alert.alert_reason}`);
  };
  
  // Update system status in the UI
  const updateSystemStatus = function(data) {
    // Skip if data is missing
    if (!data) {
      console.warn('Received invalid system status data', data);
      return;
    }
    
    // Update uptime
    const uptimeElement = document.getElementById('server-uptime');
    if (uptimeElement && data.uptime) {
      // Format uptime
      const uptime = data.uptime;
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      
      uptimeElement.textContent = `${days}日 ${hours}時間 ${minutes}分 ${seconds}秒`;
    }
    
    // Update memory usage
    const memoryElement = document.getElementById('memory-usage');
    if (memoryElement && data.memoryUsage) {
      // Format memory usage (convert to MB)
      const rss = Math.round(data.memoryUsage.rss / (1024 * 1024));
      const heapTotal = Math.round(data.memoryUsage.heapTotal / (1024 * 1024));
      const heapUsed = Math.round(data.memoryUsage.heapUsed / (1024 * 1024));
      
      memoryElement.textContent = `RSS: ${rss} MB, Heap: ${heapUsed}/${heapTotal} MB`;
    }
    
    // Update timestamp
    const timestampElement = document.getElementById('system-last-updated');
    if (timestampElement) {
      timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
    }
  };
  
  // Refresh data for a specific sensor
  const refreshData = function(sensorId) {
    dataService.refreshSensorData(sensorId);
  };
  
  // Refresh alert data for a specific sensor
  const refreshAlertData = function(sensorId) {
    dataService.refreshAlertData(sensorId);
  };
  
  // Refresh system status
  const refreshSystemStatus = function() {
    dataService.refreshSystemStatus(socket);
  };
  
  // Refresh settings data for a specific sensor
  const refreshSettingsData = function(sensorId) {
    dataService.refreshSettingsData(sensorId, socket);
  };
  
  // Refresh personality data for a specific sensor
  const refreshPersonalityData = function(sensorId) {
    dataService.refreshPersonalityData(sensorId, socket);
  };
  
  // Get socket instance
  const getSocket = function() {
    return socket;
  };
  
  // Update sensor activity timestamp
  const updateSensorActivity = function(sensorId) {
    if (sensorLastActivity.hasOwnProperty(sensorId)) {
      sensorLastActivity[sensorId] = Date.now();
    } else {
      console.warn(`Unknown sensor ID: ${sensorId}`);
    }
  };
  
  // Show connecting state during reconnect attempts
  const showConnecting = function() {
    const statusContainer = document.querySelector('.connection-status');
    const statusText = document.querySelector('.connection-status-text');
    const statusIcon = document.querySelector('.connection-status-icon');
    
    if (!statusContainer || !statusText || !statusIcon) {
      return;
    }
    
    // Remove existing status classes
    statusContainer.classList.remove('connected', 'disconnected');
    statusContainer.classList.add('connecting');
    
    // Update text and icon
    statusText.textContent = '接続中...';
    statusIcon.textContent = '◌';
  };
  
  // Public methods
  return {
    init: init,
    refreshData: refreshData,
    refreshAlertData: refreshAlertData,
    refreshSystemStatus: refreshSystemStatus,
    refreshSettingsData: refreshSettingsData,
    refreshPersonalityData: refreshPersonalityData,
    getSocket: getSocket,
    updateSensorActivity: updateSensorActivity
  };
})();

export default SensorApp;
