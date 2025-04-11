import express from 'express';
import sensorController from '../controllers/sensorController.js';
import { validateSensorData, validateSensorId } from '../middleware/validationMiddleware.js';

/**
 * Setup and return API routes with Socket.io instance
 * @param {SocketIO.Server} io - Socket.io server instance
 * @returns {express.Router} Configured Express router
 */
const setupRoutes = (io) => {
  const router = express.Router();

  // POST /api/data - Receive sensor data
  router.post('/data', validateSensorData, (req, res) => sensorController.processSensorData(req, res, io));

  // GET /api/sensors/:sensorId/readings - Get the latest readings for a specific sensor
  router.get('/sensors/:sensorId/readings', validateSensorId, sensorController.getSensorReadings);

  // GET /api/data - Get all sensor data
  router.get('/data', sensorController.getAllSensorData);

  // GET /api/data/:sensorId - Get data for a specific sensor
  router.get('/data/:sensorId', validateSensorId, sensorController.getSensorData);

  // GET /api/alerts/:sensorId - Get alerts for a specific sensor
  router.get('/alerts/:sensorId', validateSensorId, sensorController.getAlertHistory);

  // POST /api/alerts - Create a new alert directly from request body
  router.post('/alerts', (req, res) => sensorController.processAlertData(req, res, io));

  // GET /api/alerts - Get all alerts (read-only)
  router.get('/alerts', sensorController.getAllAlerts);

  return router;
};

export default setupRoutes;
