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
 */
export const processSensorData = async (req, res, io) => {
  try {
    logger.debug('Received sensor data:', req.body);

    const requiredFields = ['sensor_id', 'date', 'time', 'temperature_data', 'average_temp', 'status'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      logger.warn('Missing required fields in sensor data', { missingFields, receivedData: req.body });
      return res.status(400).json({ message: 'Missing required fields', missingFields });
    }

    // Save sensor data
    const sensorData = new TemperatureSensor(req.body);
    await sensorData.save();

    logger.debug('Sensor data saved successfully', {
      sensorId: sensorData.sensor_id,
      averageTemp: sensorData.average_temp,
      status: sensorData.status
    });

    // Emit sensor data to connected clients
    io.emit('newSensorData', {
      sensor_id: sensorData.sensor_id,
      date: sensorData.date,
      time: sensorData.time,
      average_temp: sensorData.average_temp,
      temperature_data: sensorData.temperature_data,
      status: sensorData.status,
      created_at: sensorData.created_at
    });

    // Check for temperature alert conditions
    let alertReason = null;
    if (sensorData.average_temp <= 20) {
      alertReason = '温度が 20°C未満になりました';
    } else if (sensorData.average_temp >= 70) {
      alertReason = '温度が 70°C超えました';
    } else if (!sensorData.status.includes('正常')) {
      alertReason = '温度が正常範囲に戻りました';
    }

    // Create alert if needed
    if (alertReason) {
      // Check for recent similar alerts to avoid duplicates
      const recentAlert = await Alert.findOne({
        sensor_id: sensorData.sensor_id,
        alert_reason: alertReason,
        created_at: { $gte: new Date(Date.now() - 30000) } // Within last 30 seconds
      });

      if (!recentAlert) {
        const alert = new Alert({
          sensor_id: sensorData.sensor_id,
          date: sensorData.date,
          time: sensorData.time,
          alert_reason: alertReason,
          status: 'alert',
          created_at: new Date()
        });

        await alert.save();
        logger.info('Created new alert', {
          sensorId: alert.sensor_id,
          reason: alert.alert_reason,
          temperature: sensorData.average_temp
        });

        // Emit alert to connected clients
        io.emit('newAlert', {
          sensor_id: alert.sensor_id,
          date: alert.date,
          time: alert.time,
          message: alert.alert_reason
        });
      }
    }

    res.status(201).json({ message: 'Data received and stored successfully' });
  } catch (error) {
    logger.error('Error processing sensor data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Process and save alert data directly from request body
 */
export const processAlertData = async (req, res, io) => {
  try {
    logger.debug('Received alert data:', req.body);

    const requiredFields = ['sensor_id', 'date', 'time', 'alert_reason', 'status'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      logger.warn('Missing alert fields in request body', { missingFields, receivedData: req.body });
      return res.status(400).json({ message: 'Missing required alert fields', missingFields });
    }

    const alert = new Alert({
      sensor_id: req.body.sensor_id,
      date: req.body.date,
      time: req.body.time,
      alert_reason: req.body.alert_reason,
      status: req.body.status,
      created_at: new Date()
    });

    await alert.save();

    logger.info('Alert saved successfully', {
      sensorId: alert.sensor_id || 'unknown',
      alertReason: alert.alert_reason || 'unknown'
    });

    io.emit('newAlert', {
      sensor_id: alert.sensor_id,
      date: alert.date,
      time: alert.time,
      message: alert.alert_reason
    });

    return res.status(201).json({ message: 'Alert saved successfully' });
  } catch (error) {
    logger.error('Error saving alert from body:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get latest sensor data
 */
export const getLatestSensorData = async (req, res) => {
  try {
    const { sensorId } = req.params;
    const query = sensorId ? { sensor_id: sensorId } : {};
    const limit = parseInt(req.query.limit) || 100;

    const latestReadings = await TemperatureSensor.find(query)
      .sort({ created_at: -1 })
      .limit(limit);

    if (req.query.format === 'json') {
      return res.json(latestReadings);
    }

    const latestAlerts = await Alert.find(query)
      .sort({ created_at: -1 })
      .limit(10);

    res.render('index', {
      title: '温度センサー監視システム',
      latestReadings: {
        data: latestReadings,
        alerts: latestAlerts
      }
    });
  } catch (error) {
    logger.error('Error fetching sensor data:', error);
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
 * Send initial data to Socket.io client
 */
export const sendInitialData = async (socket) => {
  try {
    const latestReadings = await TemperatureSensor.find()
      .sort({ created_at: -1 })
      .limit(100);

    const latestAlerts = await Alert.find()
      .sort({ created_at: -1 })
      .limit(10);

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
    socket.emit('error', {
      message: 'Failed to load initial data',
      type: 'data_loading_error'
    });
  }
};

/**
 * Get alert history
 */
export const getAlertHistory = async (req, res) => {
  try {
    const { sensorId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    if (!sensorId) {
      return res.status(400).json({ error: 'Sensor ID is required' });
    }

    logger.debug(`Fetching alert history for sensor ${sensorId}, limit: ${limit}`);

    const alerts = await Alert.find({ sensor_id: sensorId })
      .sort({ created_at: -1 })
      .limit(limit);

    logger.info(`Found ${alerts.length} alerts for sensor ${sensorId}`);

    const formattedAlerts = alerts.map(alert => {
      const timestamp = alert.created_at || new Date();
      return {
        date: alert.date || timestamp.toISOString().split('T')[0],
        time: alert.time || timestamp.toTimeString().split(' ')[0],
        timestamp,
        sensor_id: alert.sensor_id,
        message: alert.alert_reason || alert.message,
        status: alert.status,
        severity: alert.severity || 'medium'
      };
    });

    res.json(formattedAlerts);
  } catch (error) {
    logger.error('Error fetching alert history:', error);
    res.status(500).json({ error: 'Error fetching alert history' });
  }
};

/**
 * Get system status
 */
export const getSystemStatus = async (req, res) => {
  try {
    const systemStatus = {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memoryUsage: process.memoryUsage(),
      sensorCount: await TemperatureSensor.countDocuments(),
      alertCount: await Alert.countDocuments(),
      activeSensors: await TemperatureSensor.distinct('sensor_id').length
    };

    res.json(systemStatus);
  } catch (error) {
    logger.error('Error fetching system status:', error);
    res.status(500).json({ error: 'Failed to fetch system status' });
  }
};
