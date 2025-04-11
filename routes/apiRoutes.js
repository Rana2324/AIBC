/**
 * API Routes
 * Handles all API endpoints for the temperature sensor monitoring system
 */
import express from 'express';
import { 
  processSensorData, 
  getLatestSensorData, 
  getAlertHistory,
  getSystemStatus,
  processAlertData
} from '../controllers/sensorController.js';
import { 
  validateSensorData, 
  validateSensorId
} from '../middleware/validationMiddleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import TemperatureSensor from '../models/temperatureSensor.js';
import Alert from '../models/alert.js';

/**
 * Setup routes with Socket.io instance
 * @param {SocketIO.Server} io - Socket.io server instance
 * @returns {express.Router} Express router with all API routes
 */
const setupRoutes = (io) => {
  const router = express.Router();

  // POST /api/data - Receive sensor data
  router.post('/data', validateSensorData, asyncHandler((req, res) => processSensorData(req, res, io)));

  // GET /api/sensors/:sensorId/readings - Get the latest sensor readings for a specific sensor
  router.get('/sensors/:sensorId/readings', validateSensorId, asyncHandler(async (req, res) => {
    try {
      const sensorData = await TemperatureSensor.find({ sensor_id: req.params.sensorId })
        .sort({ created_at: -1 })
        .limit(100);
        
      res.status(200).json({
        data: sensorData
      });
    } catch (error) {
      logger.error('Error retrieving sensor data:', error);
      res.status(500).json({ message: 'Error retrieving sensor data', error: error.message });
    }
  }));

  // GET /api/data - Get all sensor data
  router.get('/data', asyncHandler(async (req, res) => {
    try {
      const sensorData = await TemperatureSensor.find()
        .sort({ created_at: -1 })
        .limit(100);
      
      res.status(200).json({
        data: sensorData
      });
    } catch (error) {
      logger.error('Error retrieving data:', error);
      res.status(500).json({ message: 'Error retrieving data', error: error.message });
    }
  }));

  // GET /api/data/:sensorId - Get data for a specific sensor
  router.get('/data/:sensorId', validateSensorId, asyncHandler(async (req, res) => {
    try {
      const sensorData = await TemperatureSensor.find({ sensor_id: req.params.sensorId })
        .sort({ created_at: -1 })
        .limit(100);
      
      res.status(200).json({
        data: sensorData
      });
    } catch (error) {
      logger.error('Error retrieving sensor data:', error);
      res.status(500).json({ message: 'Error retrieving sensor data', error: error.message });
    }
  }));

  // GET /api/alerts/:sensorId - Get alerts for a specific sensor
  router.get('/alerts/:sensorId', validateSensorId, asyncHandler((req, res) => getAlertHistory(req, res)));

  // POST /api/alerts - Create a new alert directly from request body
  router.post('/alerts', asyncHandler((req, res) => processAlertData(req, res, io)));

  // GET /api/alerts - Get all alerts (read-only, no alert creation)
  router.get('/alerts', asyncHandler(async (req, res) => {
    try {
      logger.debug('Fetching all alerts');

      // Only fetch existing alerts from MongoDB - no alert creation
      const alerts = await Alert.find()
        .sort({ created_at: -1 })
        .limit(100);
      
      logger.info(`Found ${alerts.length} alerts`);
      
      res.status(200).json({
        data: alerts
      });
    } catch (error) {
      logger.error('Error retrieving alerts:', error);
      res.status(500).json({ message: 'Error retrieving alerts', error: error.message });
    }
  }));
  
  // GET /api/system/status - Get system status information
  router.get('/system/status', asyncHandler((req, res) => getSystemStatus(req, res)));

  return router;
};

export default setupRoutes;
