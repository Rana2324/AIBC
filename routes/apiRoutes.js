/**
 * API Routes
 * Handles all API endpoints
 */
import express from 'express';
import { processSensorData, getLatestSensorData, getAlertHistory } from '../controllers/sensorController.js';

const router = express.Router();

/**
 * Setup routes with Socket.io instance
 */
const setupRoutes = (io) => {
  // POST /api/data - Receive sensor data
  router.post('/data', (req, res) => processSensorData(req, res, io));

  // GET /api/sensors/:sensorId/readings - Get the latest sensor readings
  router.get('/sensors/:sensorId/readings', (req, res) => getLatestSensorData(req, res));

  // GET /api/alerts/:sensorId - Get alerts for a specific sensor (max 10 latest)
  router.get('/alerts/:sensorId', (req, res) => getAlertHistory(req, res));

  return router;
};

export default setupRoutes;
