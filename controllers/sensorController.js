/**
 * Sensor Controller
 * Handles all temperature sensor data related operations including:
 * - Processing incoming sensor data
 * - Sending data to clients
 * - Managing alerts
 * - Retrieving sensor history
 */
import TemperatureSensor from '../models/temperatureSensor.js';
import Alert from '../models/alert.js';
import logger from '../utils/logger.js';

/**
 * Process and save incoming sensor data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {SocketIO.Server} io - Socket.io server instance for real-time updates
 */
export const processSensorData = async (req, res, io) => {
  try {

    console.log('Received sensor data:', req.body);
    // Validate that the required fields exist
    const requiredFields = ['sensor_id', 'date', 'time', 'temperature_data', 'average_temp', 'status'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      logger.warn('Missing required fields in sensor data', { 
        missingFields, 
        receivedData: req.body 
      });
      
      return res.status(400).json({ 
        message: 'Missing required fields', 
        missingFields: missingFields 
      });
    }
    
    // Save data to MongoDB
    const sensorData = new TemperatureSensor(req.body);
    await sensorData.save();
    
    logger.debug('Sensor data saved successfully', {
      sensorId: sensorData.sensor_id,
      averageTemp: sensorData.average_temp,
      status: sensorData.status
    });
    
    // Prepare data for real-time emission
    const sensorDataForEmit = {
      sensor_id: sensorData.sensor_id,
      date: sensorData.date,
      time: sensorData.time,
      average_temp: sensorData.average_temp,
      temperature_data: sensorData.temperature_data,
      status: sensorData.status,
      created_at: sensorData.created_at
    };
    
    // Emit the new data to all connected clients via Socket.io
    io.emit('newSensorData', sensorDataForEmit);
    
    // Check if we need to create an alert
    if (!sensorData.status.includes('正常')) {
      await createAndEmitAlert(sensorData, io);
    }
    
    res.status(201).json({ message: 'Data received and stored successfully' });
  } catch (error) {
    logger.error('Error processing sensor data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Create alert from sensor data and emit to clients
 * @private
 * @param {Object} sensorData - Sensor data object
 * @param {SocketIO.Server} io - Socket.io server instance
 */
async function createAndEmitAlert(sensorData, io) {
  try {
    // Format temperature to 2 decimal places for cleaner display
    const formattedTemp = sensorData.average_temp.toFixed(2);
    const alertMessage = `温度異常: ${formattedTemp}°C`;
    
    // Create and save alert
    const alert = new Alert({
      sensor_id: sensorData.sensor_id,
      date: sensorData.date,
      time: sensorData.time,
      alert_reason: sensorData.status,
      status: 'active',
      message: alertMessage
    });
    
    await alert.save();
    logger.info('Created new alert', {
      sensorId: alert.sensor_id,
      reason: alert.alert_reason
    });
    
    // Emit alert to all connected clients
    io.emit('newAlert', {
      sensor_id: alert.sensor_id,
      date: alert.date,
      time: alert.time,
      message: alertMessage
    });
    
    return alert;
  } catch (error) {
    logger.error('Error creating alert:', error);
    throw error; // Re-throw to be handled by calling function
  }
}

/**
 * Get latest sensor data for the web interface
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getLatestSensorData = async (req, res) => {
  try {
    // Get sensor ID from request parameters, if any
    const { sensorId } = req.params;
    const query = sensorId ? { sensor_id: sensorId } : {};
    const limit = parseInt(req.query.limit) || 100;
    
    // Fetch the latest sensor readings from MongoDB
    const latestReadings = await TemperatureSensor.find(query)
      .sort({ created_at: -1 })
      .limit(limit);
    
    // If format=json is specified, return JSON data
    if (req.query.format === 'json') {
      return res.json(latestReadings);
    }
    
    // Otherwise, fetch alerts and render the page
    const latestAlerts = await Alert.find(query)
      .sort({ created_at: -1 })
      .limit(10);
    
    // Render the index page with the data
    res.render('index', { 
      title: '温度センサー監視システム',
      latestReadings: {
        data: latestReadings,
        alerts: latestAlerts
      }
    });
  } catch (error) {
    logger.error('Error fetching sensor data:', error);
    
    // Determine response based on request type
    if (req.xhr || req.query.format === 'json') {
      res.status(500).json({ error: 'Failed to fetch sensor data' });
    } else {
      res.status(500).render('error', { 
        title: 'エラー | 温度センサー監視システム',
        message: 'Failed to fetch sensor data', 
        error 
      });
    }
  }
};

/**
 * Send initial data to a newly connected Socket.io client
 * @param {SocketIO.Socket} socket - Socket.io client socket
 */
export const sendInitialData = async (socket) => {
  try {
    // Fetch latest sensor data
    const latestReadings = await TemperatureSensor.find()
      .sort({ created_at: -1 })
      .limit(100);
    
    // Fetch latest alerts
    const latestAlerts = await Alert.find()
      .sort({ created_at: -1 })
      .limit(10);
    
    // Send data to the connected client
    socket.emit('initialData', {
      sensorData: latestReadings,
      alerts: latestAlerts
    });
    
    logger.debug('Initial data sent to client', { 
      socketId: socket.id,
      readingsCount: latestReadings.length,
      alertsCount: latestAlerts.length
    });
  } catch (error) {
    logger.error('Error sending initial data:', error);
    
    // Send error notification to client
    socket.emit('error', {
      message: 'Failed to load initial data',
      type: 'data_loading_error'
    });
  }
};

/**
 * Get alert history for a specific sensor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAlertHistory = async (req, res) => {
  try {
    const { sensorId } = req.params;
    const limit = parseInt(req.query.limit) || 10; // Default to 10 if not specified
    
    if (!sensorId) {
      return res.status(400).json({ error: 'Sensor ID is required' });
    }
    
    // Fetch the latest alerts for this sensor, sorted by timestamp (newest first)
    const alerts = await Alert.find({ sensor_id: sensorId })
      .sort({ created_at: -1 })
      .limit(limit)
      .exec();
    
    // Format alerts for display
    const formattedAlerts = alerts.map(alert => {
      const timestamp = alert.created_at || new Date();
      return {
        date: alert.date || timestamp.toISOString().split('T')[0],
        time: alert.time || timestamp.toTimeString().split(' ')[0],
        timestamp: timestamp,
        sensor_id: alert.sensor_id,
        message: alert.alert_reason || alert.message,
        status: alert.status,
        severity: alert.severity || 'medium'
      };
    });
    
    // Return alert data
    res.json(formattedAlerts);
  } catch (error) {
    logger.error('Error fetching alert history:', error);
    res.status(500).json({ error: 'Error fetching alert history' });
  }
};

/**
 * Get system status information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getSystemStatus = async (req, res) => {
  try {
    // Calculate basic system metrics
    const systemStatus = {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memoryUsage: process.memoryUsage(),
      sensorCount: await TemperatureSensor.countDocuments(),
      alertCount: await Alert.countDocuments(),
      activeSensors: await TemperatureSensor.distinct('sensor_id').countDocuments()
    };
    
    res.json(systemStatus);
  } catch (error) {
    logger.error('Error fetching system status:', error);
    res.status(500).json({ error: 'Failed to retrieve system status' });
  }
};
