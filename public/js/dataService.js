/**
 * Data Service Module
 * Handles all API calls and data fetching for the temperature sensor monitoring system
 */
import axios from 'https://cdn.jsdelivr.net/npm/axios@1.3.5/+esm';
import uiUtils from './uiUtils.js';

// DataService module using IIFE pattern
const DataService = (function() {
  // Create axios instance with default config
  const api = axios.create({
    baseURL: '/api',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  /**
   * Refresh data for a specific sensor
   * @param {string} sensorId - Sensor ID
   */
  const refreshSensorData = async function(sensorId) {
    // Show loading indicator
    const timestampElement = document.getElementById(`data-last-updated-${sensorId}`);
    if (timestampElement) {
      timestampElement.textContent = '読み込み中...';
    } else {
      console.warn(`Element with ID data-last-updated-${sensorId} not found`);
      return; // Exit early if element doesn't exist
    }
    
    // Check if the sensor is disconnected first
    const statusElement = document.querySelector(`#sensor-${sensorId} .sensor-status`);
    if (statusElement && (statusElement.textContent === '未接続' || statusElement.classList.contains('inactive'))) {
      // Sensor is disconnected, show inactive message instead of fetching data
      console.log(`Sensor ${sensorId} is disconnected, not fetching data`);
      if (timestampElement) {
        timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
      }
      uiUtils.setInactiveMessage(sensorId, 'data');
      return;
    }
    
    try {
      // Fetch sensor data from API using axios
      const response = await api.get(`/sensors/${sensorId}/readings`, {
        params: { limit: 10 }
      });
      
      // Update last updated timestamp
      if (timestampElement) {
        timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
      }
      
      // Get the sensor tbody element
      const sensorTbody = document.getElementById(`tbody-${sensorId}`);
      if (!sensorTbody) {
        console.warn(`Element with ID tbody-${sensorId} not found`);
        return;
      }
      
      // Clear existing content
      sensorTbody.innerHTML = '';
      
      // Check if we have data
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Add each row to the table
        response.data.forEach(reading => {
          const row = uiUtils.createSensorDataRow(reading);
          sensorTbody.appendChild(row);
        });
      } else {
        // No data, show message
        uiUtils.setInactiveMessage(sensorId, 'data');
      }
    } catch (error) {
      console.error(`Error fetching sensor data for ${sensorId}:`, error);
      
      // Update timestamp to show error
      if (timestampElement) {
        timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()} (エラー)`;
      }
      
      // Show error notification
      uiUtils.showError(`センサーデータの取得に失敗しました: ${error.message || '不明なエラー'}`);
      
      // Show error message in table
      const sensorTbody = document.getElementById(`tbody-${sensorId}`);
      if (sensorTbody) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.setAttribute('colspan', '19');
        td.classList.add('text-center', 'error-text');
        td.textContent = 'データの取得に失敗しました。再試行してください。';
        tr.appendChild(td);
        sensorTbody.innerHTML = '';
        sensorTbody.appendChild(tr);
      }
    }
  };

  /**
   * Refresh alert data for a specific sensor
   * @param {string} sensorId - Sensor ID
   */
  const refreshAlertData = async function(sensorId) {
    // Show loading indicator
    const timestampElement = document.getElementById(`alert-last-updated-${sensorId}`);
    if (timestampElement) {
      timestampElement.textContent = '読み込み中...';
    } else {
      console.warn(`Element with ID alert-last-updated-${sensorId} not found`);
      return; // Exit early if element doesn't exist
    }
    
    // Check if the sensor is disconnected first
    const statusElement = document.querySelector(`#sensor-${sensorId} .sensor-status`);
    if (statusElement && (statusElement.textContent === '未接続' || statusElement.classList.contains('inactive'))) {
      // Sensor is disconnected, show inactive message instead of fetching data
      console.log(`Sensor ${sensorId} is disconnected, not fetching alerts`);
      if (timestampElement) {
        timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
      }
      uiUtils.setInactiveMessage(sensorId, 'alert');
      return;
    }
    
    try {
      // Fetch alert data from API using axios
      const response = await api.get(`/alerts/${sensorId}`, {
        params: { limit: 10 }
      });
      
      // Update last updated timestamp
      if (timestampElement) {
        timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
      }
      
      // Get the alert tbody element
      const alertTbody = document.getElementById(`alert-tbody-${sensorId}`);
      if (!alertTbody) {
        console.warn(`Element with ID alert-tbody-${sensorId} not found`);
        return;
      }
      
      // Clear existing content
      alertTbody.innerHTML = '';
      
      // Check if we have data
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Add each row to the table
        response.data.forEach(alert => {
          const row = uiUtils.createAlertRow(alert);
          alertTbody.appendChild(row);
        });
      } else {
        // No data, show message
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.setAttribute('colspan', '3');
        td.classList.add('text-center');
        td.textContent = 'アラートはありません';
        tr.appendChild(td);
        alertTbody.appendChild(tr);
      }
    } catch (error) {
      console.error(`Error fetching alert data for ${sensorId}:`, error);
      
      // Update timestamp to show error
      if (timestampElement) {
        timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()} (エラー)`;
      }
      
      // Show error notification
      uiUtils.showError(`アラートデータの取得に失敗しました: ${error.message || '不明なエラー'}`);
      
      // Show error message in table
      const alertTbody = document.getElementById(`alert-tbody-${sensorId}`);
      if (alertTbody) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.setAttribute('colspan', '3');
        td.classList.add('text-center', 'error-text');
        td.textContent = 'アラートデータの取得に失敗しました。再試行してください。';
        tr.appendChild(td);
        alertTbody.innerHTML = '';
        alertTbody.appendChild(tr);
      }
    }
  };

  /**
   * Refresh system status data
   * @param {SocketIO.Socket} socket - Socket.io client socket
   */
  const refreshSystemStatus = function(socket) {
    // Show loading indicator
    const timestampElement = document.getElementById('system-last-updated');
    if (timestampElement) {
      timestampElement.textContent = '読み込み中...';
    }
    
    // Request system status via socket
    if (socket) {
      socket.emit('requestSystemStatus');
    } else {
      console.warn('Socket not available for system status request');
      
      // Update timestamp to show error
      if (timestampElement) {
        timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()} (エラー)`;
      }
      
      // Show error notification
      uiUtils.showError('システム状態の取得に失敗しました: ソケット接続がありません');
    }
  };

  /**
   * Refresh settings data for a specific sensor
   * @param {string} sensorId - Sensor ID
   * @param {SocketIO.Socket} socket - Socket.io client socket
   */
  const refreshSettingsData = function(sensorId, socket) {
    // Show loading indicator
    const timestampElement = document.getElementById(`settings-last-updated-${sensorId}`);
    if (timestampElement) {
      timestampElement.textContent = '読み込み中...';
    }
    
    // Request settings data via socket
    if (socket) {
      socket.emit('requestSettings', { sensorId });
    } else {
      console.warn('Socket not available for settings request');
      
      // Update timestamp to show error
      if (timestampElement) {
        timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()} (エラー)`;
      }
      
      // Show error notification
      uiUtils.showError('設定データの取得に失敗しました: ソケット接続がありません');
    }
  };

  /**
   * Refresh personality data for a specific sensor
   * @param {string} sensorId - Sensor ID
   * @param {SocketIO.Socket} socket - Socket.io client socket
   */
  const refreshPersonalityData = function(sensorId, socket) {
    // Show loading indicator
    const timestampElement = document.getElementById(`personality-last-updated-${sensorId}`);
    if (timestampElement) {
      timestampElement.textContent = '読み込み中...';
    }
    
    // For now, just update the timestamp since this is a placeholder
    if (timestampElement) {
      timestampElement.textContent = `最終更新: ${new Date().toLocaleTimeString()}`;
    }
  };
  
  // Public methods
  return {
    refreshSensorData,
    refreshAlertData,
    refreshSystemStatus,
    refreshSettingsData,
    refreshPersonalityData
  };
})();

export default DataService;
