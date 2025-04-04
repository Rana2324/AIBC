/**
 * API Routes
 * Handles all API endpoints
 */
import express from 'express';
import { processSensorData } from '../controllers/sensorController.js';

const router = express.Router();

/**
 * Setup routes with Socket.io instance
 */
const setupRoutes = (io) => {
  // POST /api/data - Receive sensor data
  router.post('/data', (req, res) => processSensorData(req, res, io));
  
  return router;
};

export default setupRoutes;
