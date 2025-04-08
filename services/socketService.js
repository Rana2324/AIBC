/**
 * Socket Service
 * Handles Socket.io connections and events for real-time data transmission
 */

// Import models
import TemperatureSensor from '../models/temperatureSensor.js';
import Alert from '../models/alert.js';
import logger from '../utils/logger.js';

/**
 * Initialize Socket.io service
 * @param {SocketIO.Server} io - Socket.io server instance
 */
export const initSocketService = (io) => {
  if (!io) {
    logger.error('Socket.io instance not provided to initSocketService');
    return;
  }

  io.on('connection', (socket) => {
    logger.debug('Client connected', { socketId: socket.id });
    
    // Send initial data to the newly connected client
    sendInitialData(socket);
    
    // Set up event handlers for this connection
    setupSocketEventHandlers(socket);
    
    // Handle disconnect
    socket.on('disconnect', () => {
      logger.debug('Client disconnected', { socketId: socket.id });
    });
  });

  // Log active connections count every minute in development
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      const connectionsCount = io.sockets.sockets.size;
      logger.debug(`Active socket connections: ${connectionsCount}`);
    }, 60000);
  }
};

/**
 * Set up event handlers for a socket connection
 * @param {SocketIO.Socket} socket - Socket.io client socket
 */
function setupSocketEventHandlers(socket) {
  // Handle data requests from the client
  socket.on('requestData', async ({ sensorId }) => {
    try {
      const data = await TemperatureSensor.find(
        sensorId ? { sensor_id: sensorId } : {}
      )
        .sort({ created_at: -1 })
        .limit(100);
      
      socket.emit('sensorData', data);
      logger.debug('Sent sensor data to client', { socketId: socket.id, sensorId, count: data.length });
    } catch (error) {
      logger.error('Error fetching sensor data:', { error: error.message, socketId: socket.id, sensorId });
      socket.emit('error', { 
        type: 'data_fetch_error', 
        message: 'Failed to fetch sensor data',
        sensorId
      });
    }
  });
  
  socket.on('requestAlerts', async ({ sensorId }) => {
    try {
      const alerts = await Alert.find(
        sensorId ? { sensor_id: sensorId } : {}
      )
        .sort({ created_at: -1 })
        .limit(10);
      
      socket.emit('alertData', alerts);
      logger.debug('Sent alert data to client', { socketId: socket.id, sensorId, count: alerts.length });
    } catch (error) {
      logger.error('Error fetching alert data:', { error: error.message, socketId: socket.id, sensorId });
      socket.emit('error', { 
        type: 'alert_fetch_error', 
        message: 'Failed to fetch alert data',
        sensorId
      });
    }
  });
  
  // Handle system status requests
  socket.on('requestSystemStatus', () => {
    const systemStatus = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
    socket.emit('systemStatus', systemStatus);
  });
  
  // Handle settings requests
  socket.on('requestSettings', async ({ sensorId }) => {
    if (!sensorId) {
      socket.emit('error', { 
        type: 'invalid_request', 
        message: 'Sensor ID is required for settings'
      });
      return;
    }
    
    try {
      // This could be expanded to fetch actual settings from a database
      const settings = {
        sensorId,
        lastUpdated: new Date().toISOString(),
        parameters: {
          interval: '5m',
          threshold: '35.5',
          alertEnabled: true
        }
      };
      socket.emit('settingsData', settings);
    } catch (error) {
      logger.error('Error fetching settings:', { error: error.message, socketId: socket.id, sensorId });
      socket.emit('error', { 
        type: 'settings_error', 
        message: 'Failed to fetch settings',
        sensorId
      });
    }
  });
}

/**
 * Send initial data to a connected client
 * @param {SocketIO.Socket} socket - Socket.io client socket
 */
async function sendInitialData(socket) {
  try {
    // Get the latest sensor data
    const sensorData = await TemperatureSensor.find()
      .sort({ created_at: -1 })
      .limit(100);
    
    // Get the latest alerts
    const alerts = await Alert.find()
      .sort({ created_at: -1 })
      .limit(10);
    
    // Format data for the client
    const formattedData = sensorData.map(reading => ({
      sensor_id: reading.sensor_id,
      date: reading.date,
      time: reading.time,
      average_temp: reading.average_temp,
      temperature_data: reading.temperature_data,
      status: reading.status,
      created_at: reading.created_at
    }));
    
    // Format alerts for the client
    const formattedAlerts = alerts.map(alert => ({
      sensor_id: alert.sensor_id,
      date: alert.date,
      time: alert.time,
      message: alert.alert_reason || `Temperature alert: ${alert.sensor_id}`,
      status: alert.status,
      created_at: alert.created_at
    }));
    
    // Send the initial data to the client
    socket.emit('initialData', {
      sensorData: formattedData,
      alerts: formattedAlerts
    });
    
    logger.debug('Sent initial data to client', { 
      socketId: socket.id, 
      sensorCount: formattedData.length, 
      alertCount: formattedAlerts.length 
    });
  } catch (error) {
    logger.error('Error sending initial data:', { error: error.message, socketId: socket.id });
    socket.emit('error', { 
      type: 'initial_data_error', 
      message: 'Failed to load initial data'
    });
  }
}
