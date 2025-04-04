/**
 * Real-time Sensor Data Display
 * Handles WebSocket connections and updates the UI with real-time sensor data
 */

// Initialize WebSocket connection
const socket = io();

// Temperature thresholds
const thresholds = {
    low: 20,  // 下限20°C
    high: 70  // 上限70°C
};

// Store latest data for each sensor
const sensorData = {
    'sensor_1': [],
    'sensor_2': [],
    'sensor_3': []
};

// Connect to WebSocket server
socket.on('connect', () => {
    console.log('Connected to server');
    document.getElementById('connectionStatus').className = 'connection-status connected';
    document.getElementById('connectionStatus').textContent = 'サーバーに接続中';
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
    document.getElementById('connectionStatus').className = 'connection-status disconnected';
    document.getElementById('connectionStatus').textContent = 'サーバーから切断';
});

// Handle incoming sensor data
socket.on('sensor-data', (data) => {
    console.log('Received data:', data);
    updateSensorDisplay(data);
});

// Handle alert updates
socket.on('alert-update', (data) => {
    updateAlertHistory(data);
});

// Update sensor display with new data
function updateSensorDisplay(data) {
    const { sensor_id, date, time, temperature_data, average_temp, status } = data;
    const sensorNumber = sensor_id.split('_')[1];
    
    // Store data in memory (keep only latest 100 records)
    if (!sensorData[sensor_id]) {
        sensorData[sensor_id] = [];
    }
    sensorData[sensor_id].unshift(data);
    if (sensorData[sensor_id].length > 100) {
        sensorData[sensor_id].pop();
    }
    
    // Update table
    const tbody = document.getElementById(`tbody-${sensorNumber}`);
    if (!tbody) return;
    
    // Create new row
    const tr = document.createElement('tr');
    const isAbnormal = average_temp > thresholds.high || average_temp < thresholds.low;
    if (isAbnormal) {
        tr.className = 'table-danger';
    }
    
    // Format temperature data for display
    const tempDisplay = temperature_data.map(temp => 
        temp !== null ? temp.toFixed(1) : '--'
    ).join(', ');
    
    tr.innerHTML = `
        <td>${date}</td>
        <td>${time}</td>
        <td>${tempDisplay}</td>
        <td>${average_temp.toFixed(2)} °C</td>
        <td>${status}</td>
    `;
    
    // Insert at the beginning of the table
    if (tbody.firstChild) {
        tbody.insertBefore(tr, tbody.firstChild);
    } else {
        tbody.appendChild(tr);
    }
    
    // Keep only latest 100 rows
    while (tbody.children.length > 100) {
        tbody.removeChild(tbody.lastChild);
    }
    
    // Update sensor status
    const sensorStatus = document.querySelector(`#sensor-${sensorNumber} .sensor-status`);
    if (sensorStatus) {
        sensorStatus.className = `sensor-status ${isAbnormal ? 'inactive' : 'active'}`;
        sensorStatus.textContent = isAbnormal ? '異常' : '正常';
    }
}

// Update alert history
function updateAlertHistory(alert) {
    const { sensor_id, date, time, alert_reason } = alert;
    const sensorNumber = sensor_id.split('_')[1];
    const tbody = document.getElementById(`alert-tbody-${sensorNumber}`);
    
    if (!tbody) return;
    
    // Create new row
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${date}</td>
        <td>${time}</td>
        <td>${alert_reason}</td>
    `;
    
    // Insert at the beginning
    if (tbody.firstChild) {
        tbody.insertBefore(tr, tbody.firstChild);
    } else {
        tbody.appendChild(tr);
    }
    
    // Keep only latest 10 alerts
    while (tbody.children.length > 10) {
        tbody.removeChild(tbody.lastChild);
    }
}

// Request initial data on page load
document.addEventListener('DOMContentLoaded', () => {
    // Request initial data from server
    socket.emit('request-initial-data');
    
    // Set the first tab as active
    const defaultTabButton = document.getElementById('sensorTabBtn');
    if (defaultTabButton) {
        defaultTabButton.click();
    }
});