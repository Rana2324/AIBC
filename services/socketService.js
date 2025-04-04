/**
 * Socket Service
 * Handles Socket.io connections and events
 */

// Import models
import TemperatureSensor from '../models/temperatureSensor.js';
import Alert from '../models/alert.js';

/**
 * Initialize Socket.io service
 * @param {SocketIO.Server} io - Socket.io server instance
 */
export const initSocketService = (io) => {
  io.on('connection', (socket) => {
    console.log('A client connected');
    
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
      } catch (error) {
        console.error('Error fetching sensor data:', error);
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
      } catch (error) {
        console.error('Error fetching alert data:', error);
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('A client disconnected');
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
  } catch (error) {
    console.error('Error sending initial data:', error);
  }
}
