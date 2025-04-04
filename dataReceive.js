/**
 * Real-time Data Processing System for Yocto Linux
 * Handles incoming data from IoT devices, stores it in MongoDB, and broadcasts updates
 */
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import SensorData from './models/SensorData.js';
import Alert from './models/Alert.js';
import logger from './utils/logger.js';
import { connectDB } from './config/db.js';
import { ApiError } from './middleware/errorHandler.js';

// Initialize Express app
const app = express();
const server = createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json({ limit: '1mb' }));

// Data Receiver Class
class DataReceiver {
  /**
   * Constructor
   * @param {Object} options - Configuration options
   * @param {Object} io - Socket.io instance for real-time updates
   */
  constructor(options = {}, io) {
    this.io = io;
    
    // Updated temperature thresholds according to requirements
    this.thresholds = {
      low: options.lowThreshold || 20,  // 下限20°C
      high: options.highThreshold || 70  // 上限70°C
    };
    
    // Default sensor validation rules
    this.validation = {
      requiredFields: ['sensorId', 'temperatures', 'timestamp'],
      maxTemperature: 100,
      minTemperature: -40,
      maxSensorCount: 16
    };
    
    // Setup retry mechanism for failed operations
    this.retryQueue = [];
    this.maxRetries = options.maxRetries || 5;
    this.retryInterval = options.retryInterval || 5000; // 5 seconds
    
    // Setup change stream if MongoDB is available
    this.setupChangeStreams();
    
    // Start retry processor
    this.startRetryProcessor();
  }
  
  /**
   * Setup MongoDB Change Streams for real-time updates
   */
  async setupChangeStreams() {
    try {
      // Ensure DB is connected
      if (mongoose.connection.readyState !== 1) {
        logger.warn('Cannot setup change streams: MongoDB not connected');
        return;
      }
      
      logger.info('Setting up MongoDB change streams for real-time updates');
      
      // Check if MongoDB instance supports change streams (must be a replica set)
      try {
        // Try to get the replica set status
        const admin = mongoose.connection.db.admin();
        const replicaStatus = await admin.command({ replSetGetStatus: 1 });
        
        if (!replicaStatus || !replicaStatus.ok) {
          logger.warn('Change streams not supported: MongoDB is not configured as a replica set');
          return;
        }
      } catch (error) {
        // If this fails, it's likely not a replica set
        if (error.code === 76 || error.codeName === 'NoReplicationEnabled' || error.message.includes('not running with replication')) {
          logger.warn('Change streams not supported: MongoDB is not configured as a replica set. Using polling updates instead.');
          this.setupPollingUpdates();
          return;
        }
        
        // For other errors, just log and continue the attempt
        logger.warn(`Couldn't verify replica set status: ${error.message}`);
      }
      
      // Watch for changes in SensorData collection
      const sensorDataStream = SensorData.watch([], { fullDocument: 'updateLookup' });
      
      sensorDataStream.on('change', (change) => {
        if (change.operationType === 'insert' || change.operationType === 'update') {
          logger.debug(`Sensor data ${change.operationType} detected, broadcasting update`);
          
          // Broadcast to all connected clients
          this.io.emit('sensor-data-update', {
            type: change.operationType,
            data: change.fullDocument
          });
        }
      });
      
      sensorDataStream.on('error', (error) => {
        logger.error('Error in SensorData change stream:', error);
        
        // If the error is related to replica set, switch to polling
        if (error.code === 40573 || error.message.includes('only supported on replica sets')) {
          logger.info('Switching to polling updates due to lack of replica set support');
          this.setupPollingUpdates();
          return;
        }
        
        // Otherwise, try to restart the stream after a delay
        setTimeout(() => this.setupChangeStreams(), 5000);
      });
      
      // Watch for changes in Alert collection
      const alertStream = Alert.watch([], { fullDocument: 'updateLookup' });
      
      alertStream.on('change', (change) => {
        if (change.operationType === 'insert') {
          logger.debug('New alert detected, broadcasting update');
          
          // Broadcast to all connected clients
          this.io.emit('alert-update', {
            type: change.operationType,
            data: change.fullDocument
          });
        }
      });
      
      alertStream.on('error', (error) => {
        logger.error('Error in Alert change stream:', error);
        
        // If the error is related to replica set, we already set up polling in the other error handler
        if (!error.code === 40573 && !error.message.includes('only supported on replica sets')) {
          // Try to restart the stream after a delay
          setTimeout(() => this.setupChangeStreams(), 5000);
        }
      });
      
      logger.info('MongoDB change streams setup complete');
      
    } catch (error) {
      logger.error('Failed to setup change streams:', error);
      // Fall back to polling
      this.setupPollingUpdates();
    }
  }
  
  /**
   * Setup polling updates as fallback when change streams are not available
   */
  setupPollingUpdates() {
    logger.info('Setting up polling mechanism for updates');
    
    // Keep track of last seen documents
    let lastSensorId = null;
    let lastAlertId = null;
    
    // Poll for new sensor data every 5 seconds
    const pollInterval = 5000; // 5 seconds
    
    // Set up polling interval
    setInterval(async () => {
      try {
        // Poll for new sensor data
        const latestSensorData = await SensorData.find()
          .sort({ timestamp: -1 })
          .limit(10);
        
        if (latestSensorData.length > 0) {
          // If we have a last ID, filter out data we've already seen
          const newData = lastSensorId 
            ? latestSensorData.filter(data => data._id.toString() !== lastSensorId)
            : latestSensorData;
          
          // Update last seen ID
          if (latestSensorData[0]) {
            lastSensorId = latestSensorData[0]._id.toString();
          }
          
          // Broadcast new data
          if (newData.length > 0) {
            newData.forEach(data => {
              this.io.emit('sensor-data-update', {
                type: 'insert',
                data: data
              });
            });
          }
        }
        
        // Poll for new alerts
        const latestAlerts = await Alert.find()
          .sort({ timestamp: -1 })
          .limit(5);
        
        if (latestAlerts.length > 0) {
          // If we have a last ID, filter out alerts we've already seen
          const newAlerts = lastAlertId 
            ? latestAlerts.filter(alert => alert._id.toString() !== lastAlertId)
            : latestAlerts;
          
          // Update last seen ID
          if (latestAlerts[0]) {
            lastAlertId = latestAlerts[0]._id.toString();
          }
          
          // Broadcast new alerts
          if (newAlerts.length > 0) {
            newAlerts.forEach(alert => {
              this.io.emit('alert-update', {
                type: 'insert',
                data: alert
              });
            });
          }
        }
      } catch (error) {
        logger.error('Error polling for updates:', error);
      }
    }, pollInterval);
    
    logger.info('Polling mechanism setup complete');
  }
  
  /**
   * Start retry processor for failed database operations
   */
  startRetryProcessor() {
    setInterval(() => {
      if (this.retryQueue.length > 0) {
        logger.info(`Processing retry queue: ${this.retryQueue.length} items`);
        
        // Process the first item in the queue
        const item = this.retryQueue.shift();
        
        if (item.retries < this.maxRetries) {
          // Attempt to save again
          this.saveToDatabase(item.data, item.type)
            .catch(error => {
              logger.error(`Retry attempt ${item.retries + 1} failed:`, error);
              // Increment retry count and put back in queue
              item.retries++;
              this.retryQueue.push(item);
            });
        } else {
          logger.error(`Max retries reached for item, dropping: ${JSON.stringify(item.data)}`);
          // Could implement a dead-letter queue here for further analysis
        }
      }
    }, this.retryInterval);
  }
  
  /**
   * Process incoming data from sensors with enhanced error handling
   * @param {Object} rawData - Raw data from sensor
   * @returns {Promise<Object>} - Processing result
   */
  async processIncomingData(rawData) {
    try {
      // Basic validation
      if (!rawData) {
        throw new ApiError(400, 'No data received');
      }
      
      // Log incoming data with truncated output for large payloads
      const dataStr = JSON.stringify(rawData).substring(0, 200);
      logger.debug(`Received raw data: ${dataStr}${dataStr.length > 200 ? '...' : ''}`);
      
      // Extract/prepare data
      const data = this.extractDataFields(rawData);
      
      // Validate data structure
      this.validateDataStructure(data);
      
      // Validate temperatures
      this.validateTemperatures(data.temperatures);
      
      // Format date and time
      const now = new Date();
      const acquisitionDate = data.acquisitionDate || now.toISOString().split('T')[0];
      const acquisitionTime = data.acquisitionTime || now.toTimeString().split(' ')[0];
      
      // Calculate average temperature with additional validation
      const validTemperatures = data.temperatures.filter(temp => 
        temp !== null && 
        !isNaN(temp) && 
        temp >= this.validation.minTemperature && 
        temp <= this.validation.maxTemperature
      );
      
      const temperature_ave = validTemperatures.length > 0 
        ? validTemperatures.reduce((sum, temp) => sum + temp, 0) / validTemperatures.length
        : null;
        
      // Check if temperature is abnormal
      const isAbnormal = temperature_ave !== null && (
        temperature_ave > this.thresholds.high || 
        temperature_ave < this.thresholds.low
      );
      
      // Create sensor data object
      const sensorData = {
        sensorId: data.sensorId,
        temperatures: data.temperatures,
        temperature_ave,
        acquisitionDate,
        acquisitionTime,
        isAbnormal,
        timestamp: Date.now()
      };
      
      // Try to save to database with retry mechanism
      const savedData = await this.saveToDatabase(sensorData, 'sensor');
      
      // If abnormal temperature, create and save alert
      if (isAbnormal) {
        const alertReason = temperature_ave > this.thresholds.high
          ? `高温検出: ${temperature_ave.toFixed(1)}°C`
          : `低温検出: ${temperature_ave.toFixed(1)}°C`;
        
        const alertData = {
          sensorId: data.sensorId,
          date: acquisitionDate,
          time: acquisitionTime,
          alert_reason: alertReason,
          eventType: 'TEMPERATURE_ABNORMAL',
          timestamp: Date.now()
        };
        
        const savedAlert = await this.saveToDatabase(alertData, 'alert');
        
        logger.warn(`Alert generated for sensor ${data.sensorId}: ${alertReason}`);
        
        // Send immediate real-time update for critical alerts
        this.io.emit('critical-alert', {
          sensor: savedData,
          alert: savedAlert
        });
      }
      
      logger.info(`Successfully processed data from sensor ${data.sensorId}`);
      
      // Return processing result
      return {
        success: true,
        sensorId: data.sensorId,
        data: savedData,
        alert: isAbnormal ? savedAlert : null
      };
      
    } catch (error) {
      logger.error('Failed to process sensor data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Save data to database with retry mechanism
   * @param {Object} data - Data to save
   * @param {String} type - Type of data ('sensor' or 'alert')
   * @returns {Promise<Object>} - Saved document
   */
  async saveToDatabase(data, type) {
    try {
      let savedDoc;
      
      // Check MongoDB connection
      if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB connection not available');
      }
      
      // Save based on type
      if (type === 'sensor') {
        const sensorData = new SensorData(data);
        savedDoc = await sensorData.save();
      } else if (type === 'alert') {
        const alert = new Alert(data);
        savedDoc = await alert.save();
      } else {
        throw new Error(`Unknown data type: ${type}`);
      }
      
      return savedDoc;
      
    } catch (error) {
      logger.error(`Failed to save ${type} data to database:`, error);
      
      // Add to retry queue
      this.retryQueue.push({
        data,
        type,
        retries: 0,
        timestamp: Date.now()
      });
      
      // Throw error to be handled by caller
      throw error;
    }
  }
  
  // Extract required data fields from raw data
  extractDataFields(rawData) {
    let data = {};
    
    // Handle different data formats
    if (typeof rawData === 'string') {
      try {
        data = JSON.parse(rawData);
      } catch (error) {
        throw new ApiError(400, 'Invalid JSON data');
      }
    } else if (Buffer.isBuffer(rawData)) {
      try {
        const jsonString = rawData.toString('utf8');
        data = JSON.parse(jsonString);
      } catch (error) {
        throw new ApiError(400, 'Invalid buffer data');
      }
    } else if (typeof rawData === 'object') {
      data = rawData;
    } else {
      throw new ApiError(400, 'Unsupported data format');
    }
    
    return data;
  }
  
  /**
   * Validate data structure
   * @param {Object} data - Sensor data object
   * @throws {ApiError} - If validation fails
   */
  validateDataStructure(data) {
    // Check required fields
    for (const field of this.validation.requiredFields) {
      if (data[field] === undefined) {
        throw new ApiError(400, `Missing required field: ${field}`);
      }
    }
    
    // Check sensor ID format (simple check)
    if (typeof data.sensorId !== 'string' && typeof data.sensorId !== 'number') {
      throw new ApiError(400, 'Invalid sensor ID format');
    }
    
    // Check temperatures array
    if (!Array.isArray(data.temperatures)) {
      throw new ApiError(400, 'Temperatures must be an array');
    }
    
    // Check array length
    if (data.temperatures.length === 0) {
      throw new ApiError(400, 'Empty temperatures array');
    }
    
    // Check maximum sensor count
    if (data.temperatures.length > this.validation.maxSensorCount) {
      throw new ApiError(400, `Too many temperature readings: ${data.temperatures.length}`);
    }
  }
  
  /**
   * Validate temperature values
   * @param {Array} temperatures - Array of temperature values
   * @throws {ApiError} - If validation fails
   */
  validateTemperatures(temperatures) {
    // Filter out null values (which are allowed)
    const validTemperatures = temperatures.filter(temp => temp !== null);
    
    // Check if all temperatures are null
    if (validTemperatures.length === 0) {
      throw new ApiError(400, 'All temperature readings are null');
    }
    
    // Validate each temperature value
    for (const temp of validTemperatures) {
      // Check if it's a number
      if (typeof temp !== 'number') {
        throw new ApiError(400, `Invalid temperature value: ${temp}`);
      }
      
      // Check range
      if (temp < this.validation.minTemperature || temp > this.validation.maxTemperature) {
        throw new ApiError(400, `Temperature out of valid range: ${temp}`);
      }
    }
  }
  
  /**
   * Update temperature thresholds
   * @param {Object} newThresholds - New threshold values
   */
  updateThresholds(newThresholds) {
    if (newThresholds.low !== undefined) {
      this.thresholds.low = newThresholds.low;
    }
    
    if (newThresholds.high !== undefined) {
      this.thresholds.high = newThresholds.high;
    }
    
    logger.info(`Updated temperature thresholds: Low=${this.thresholds.low}°C, High=${this.thresholds.high}°C`);
    
    // Broadcast threshold update to clients
    this.io.emit('threshold-update', this.thresholds);
  }
}

// Connect to MongoDB
connectDB()
  .then(() => {
    logger.info('MongoDB connected for data receiver');
    
    // Initialize data receiver with Socket.IO
    const dataReceiver = new DataReceiver({
      lowThreshold: process.env.LOW_TEMP_THRESHOLD || 10,
      highThreshold: process.env.HIGH_TEMP_THRESHOLD || 30,
      maxRetries: 5,
      retryInterval: 5000
    }, io);
    
    // API endpoint for receiving sensor data
    app.post('/api/data', async (req, res) => {
      try {
        const result = await dataReceiver.processIncomingData(req.body);
        
        if (result.success) {
          res.status(200).json({ 
            message: 'Data received and processed successfully',
            sensorId: result.sensorId
          });
        } else {
          res.status(400).json({ 
            error: result.error || 'Failed to process data' 
          });
        }
      } catch (error) {
        logger.error('Error processing incoming data:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // API endpoint for receiving alerts
    app.post('/api/alerts', async (req, res) => {
      logger.info(`Alert received: ${JSON.stringify(req.body)}`);
      
      try {
        // Save alert to database
        const alert = new Alert({
          ...req.body,
          timestamp: Date.now()
        });
        
        const savedAlert = await alert.save();
        
        // Broadcast alert to connected clients
        io.emit('new-alert', savedAlert);
        
        res.status(200).json({ 
          message: 'Alert received successfully',
          id: savedAlert._id
        });
      } catch (error) {
        logger.error('Error processing alert:', error);
        res.status(500).json({ error: 'Failed to process alert' });
      }
    });
    
    // Socket.IO connection handler
    io.on('connection', (socket) => {
      logger.info('Client connected to data receiver');
      
      // Send initial connection confirmation
      socket.emit('connection-established', {
        message: 'Connected to data receiver',
        timestamp: new Date()
      });
      
      // Handle threshold update requests from clients
      socket.on('update-thresholds', (thresholds) => {
        if (thresholds && (thresholds.low !== undefined || thresholds.high !== undefined)) {
          dataReceiver.updateThresholds(thresholds);
          socket.emit('thresholds-updated', dataReceiver.thresholds);
        }
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info('Client disconnected from data receiver');
      });
    });
    
    // Check if this file is being run directly or imported as a module
    const isRunningStandalone = process.argv[1]?.endsWith('dataReceive.js');
    
    // Start server only if running this file directly, not when imported
    if (isRunningStandalone) {
      // Start server with optimized settings for Yocto Linux
      const PORT = process.env.DATA_RECEIVER_PORT || 3000;
      server.listen(PORT, () => {
        logger.info(`Data receiver running on port ${PORT} (optimized for Yocto Linux)`);
      });
    } else {
      logger.info('Data receiver initialized in module mode - server not started');
    }
    
  })
  .catch(err => {
    logger.error('Failed to start data receiver:', err);
  });

// Export additional objects needed for external use
export { DataReceiver, app, server, io };