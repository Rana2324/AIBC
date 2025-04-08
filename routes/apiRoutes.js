/**
 * API Routes
 * Handles all API endpoints for the temperature sensor monitoring system
 */
import express from 'express';
import { 
  processSensorData, 
  getLatestSensorData, 
  getAlertHistory,
  getSystemStatus
} from '../controllers/sensorController.js';
import { 
  validateSensorData, 
  validateSensorId,
  validatePagination 
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
  router.get('/sensors/:sensorId/readings', validateSensorId, validatePagination, asyncHandler(async (req, res) => {
    try {
      const sensorData = await TemperatureSensor.find({ sensor_id: req.params.sensorId })
        .sort({ created_at: -1 })
        .limit(req.pagination.limit)
        .skip((req.pagination.page - 1) * req.pagination.limit);
        
      const totalCount = await TemperatureSensor.countDocuments({ sensor_id: req.params.sensorId });
      
      res.status(200).json({
        data: sensorData,
        pagination: {
          total: totalCount,
          page: req.pagination.page,
          limit: req.pagination.limit,
          pages: Math.ceil(totalCount / req.pagination.limit)
        }
      });
    } catch (error) {
      logger.error('Error retrieving sensor data:', error);
      res.status(500).json({ message: 'Error retrieving sensor data', error: error.message });
    }
  }));

  // GET /api/data - Get all sensor data with pagination
  router.get('/data', validatePagination, asyncHandler(async (req, res) => {
    try {
      const sensorData = await TemperatureSensor.find()
        .sort({ created_at: -1 })
        .limit(req.pagination.limit)
        .skip((req.pagination.page - 1) * req.pagination.limit);
      
      const totalCount = await TemperatureSensor.countDocuments();
      
      res.status(200).json({
        data: sensorData,
        pagination: {
          total: totalCount,
          page: req.pagination.page,
          limit: req.pagination.limit,
          pages: Math.ceil(totalCount / req.pagination.limit)
        }
      });
    } catch (error) {
      logger.error('Error retrieving data:', error);
      res.status(500).json({ message: 'Error retrieving data', error: error.message });
    }
  }));

  // GET /api/data/:sensorId - Get data for a specific sensor with pagination
  router.get('/data/:sensorId', validateSensorId, validatePagination, asyncHandler(async (req, res) => {
    try {
      const sensorData = await TemperatureSensor.find({ sensor_id: req.params.sensorId })
        .sort({ created_at: -1 })
        .limit(req.pagination.limit)
        .skip((req.pagination.page - 1) * req.pagination.limit);
      
      const totalCount = await TemperatureSensor.countDocuments({ sensor_id: req.params.sensorId });
      
      res.status(200).json({
        data: sensorData,
        pagination: {
          total: totalCount,
          page: req.pagination.page,
          limit: req.pagination.limit,
          pages: Math.ceil(totalCount / req.pagination.limit)
        }
      });
    } catch (error) {
      logger.error('Error retrieving sensor data:', error);
      res.status(500).json({ message: 'Error retrieving sensor data', error: error.message });
    }
  }));

  // GET /api/alerts/:sensorId - Get alerts for a specific sensor
  router.get('/alerts/:sensorId', validateSensorId, asyncHandler((req, res) => getAlertHistory(req, res)));

  // GET /api/alerts - Get all alerts with pagination
  router.get('/alerts', validatePagination, asyncHandler(async (req, res) => {
    try {
      const alerts = await Alert.find()
        .sort({ created_at: -1 })
        .limit(req.pagination.limit)
        .skip((req.pagination.page - 1) * req.pagination.limit);
      
      const totalCount = await Alert.countDocuments();
      
      res.status(200).json({
        data: alerts,
        pagination: {
          total: totalCount,
          page: req.pagination.page,
          limit: req.pagination.limit,
          pages: Math.ceil(totalCount / req.pagination.limit)
        }
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
