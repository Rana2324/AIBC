/**
 * Sensor Controller
 * Handles all sensor data related operations
 */
import TemperatureSensor from '../models/temperatureSensor.js';
import Alert from '../models/alert.js';
import logger from '../utils/logger.js';

/**
 * Process and save incoming sensor data
 */
export const processSensorData = async (req, res, io) => {
  try {
    logger.info(`Received data: ${JSON.stringify(req.body)}`);
    
    // Validate that the required fields exist
    const requiredFields = ['sensor_id', 'date', 'time', 'temperature_data', 'average_temp', 'status'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        missingFields: missingFields 
      });
    }
    
    // Save data to MongoDB
    const sensorData = new TemperatureSensor(req.body);
    await sensorData.save();
    
    // Emit the new data to all connected clients via Socket.io
    io.emit('newSensorData', {
      sensor_id: sensorData.sensor_id,
      date: sensorData.date,
      time: sensorData.time,
      average_temp: sensorData.average_temp,
      temperature_data: sensorData.temperature_data,
      status: sensorData.status,
      created_at: sensorData.created_at
    });
    
    // Check if we need to create an alert
    if (!sensorData.status.includes('正常')) {
      const alertMessage = `温度異常: ${sensorData.average_temp}°C`;
      
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
      
      // Emit alert to all connected clients
      io.emit('newAlert', {
        sensor_id: alert.sensor_id,
        date: alert.date,
        time: alert.time,
        message: alertMessage
      });
    }
    
    res.status(201).json({ message: 'Data received and stored successfully' });
  } catch (error) {
    logger.error('Error processing sensor data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get latest sensor data for the web interface
 */
export const getLatestSensorData = async (req, res) => {
  try {
    // Fetch the latest sensor readings from MongoDB (100 records as requested)
    const latestReadings = await TemperatureSensor.find()
      .sort({ created_at: -1 })
      .limit(100);
    
    // Fetch the latest 10 alerts
    const latestAlerts = await Alert.find()
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
    res.status(500).render('error', { 
      title: 'エラー | 温度センサー監視システム',
      message: 'Failed to fetch sensor data', 
      error 
    });
  }
};

/**
 * Send initial data to a newly connected Socket.io client
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
  } catch (error) {
    logger.error('Error sending initial data:', error);
  }
};

/**
 * Get alert history for a specific sensor (max 10 latest)
 */
export const getAlertHistory = async (req, res) => {
  try {
    const { sensorId } = req.params;
    const limit = parseInt(req.query.limit) || 10; // Default to 10 if not specified
    
    // Fetch the latest alerts for this sensor, sorted by timestamp (newest first)
    const alerts = await Alert.find({ sensorId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
    
    // Format alerts for display
    const formattedAlerts = alerts.map(alert => {
      const timestamp = new Date(alert.timestamp);
      return {
        date: timestamp.toISOString().split('T')[0], // YYYY-MM-DD format
        time: timestamp.toTimeString().split(' ')[0], // HH:MM:SS format
        timestamp: alert.timestamp,
        sensorId: alert.sensorId,
        message: alert.message,
        temperatureValue: alert.temperatureValue,
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
