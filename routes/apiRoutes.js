/**
 * API Routes
 * Handles all API endpoints for the temperature sensor monitoring system
 */
import express from 'express';
import sensorController from '../controllers/sensorController.js';
import { 
  validateSensorData, 
  validateSensorId
} from '../middleware/validationMiddleware.js';
import logger from '../utils/logger.js';

/**
 * Setup routes with Socket.io instance
 * @param {SocketIO.Server} io - Socket.io server instance
 * @returns {express.Router} Express router with all API routes
 */
const setupRoutes = (io) => {
  const router = express.Router();

  // Bind io parameter to controller methods that need it
  const processSensorData = (req, res) => sensorController.processSensorData(req, res, io);
  const processAlertData = (req, res) => sensorController.processAlertData(req, res, io);

  // POST /api/data - Receive sensor data
  router.post('/data', validateSensorData, processSensorData);

  // GET /api/sensors/:sensorId/readings - Get the latest sensor readings for a specific sensor
  router.get('/sensors/:sensorId/readings', validateSensorId, sensorController.getSensorReadings);

  // GET /api/data - Get all sensor data
  router.get('/data', sensorController.getAllSensorData);

  // GET /api/data/:sensorId - Get data for a specific sensor
  router.get('/data/:sensorId', validateSensorId, sensorController.getSensorData);

  // GET /api/alerts/:sensorId - Get alerts for a specific sensor
  router.get('/alerts/:sensorId', validateSensorId, sensorController.getAlertHistory);

  // POST /api/alerts - Create a new alert directly from request body
  router.post('/alerts', processAlertData);

  // GET /api/alerts - Get all alerts (read-only, no alert creation)
  router.get('/alerts', sensorController.getAllAlerts);
  
  // GET /api/system/status - Get system status information
  router.get('/system/status', sensorController.getSystemStatus);

  return router;
};

export default setupRoutes;
