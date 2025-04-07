/**
 * Socket Service
 * Handles Socket.io connections and events
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
  io.on('connection', (socket) => {
    // logger.info('A client connected', { socketId: socket.id });
    
    // Send initial data to the newly connected client
    sendInitialData(socket);
    
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
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info('A client disconnected', { socketId: socket.id });
    });
  });
};

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
    
    // logger.info('Sent initial data to client', { 
    //   socketId: socket.id, 
    //   sensorCount: formattedData.length, 
    //   alertCount: formattedAlerts.length 
    // });
  } catch (error) {
    logger.error('Error sending initial data:', { error: error.message, socketId: socket.id });
  }
}
