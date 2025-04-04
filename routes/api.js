/**
 * API Routes
 * Handles all API endpoints for the temperature sensor application
 */
import express from 'express';
import sensorController from '../controllers/sensorController.js';

const router = express.Router();

// Sensor Data Routes
router.post('/sensors/reading', sensorController.createReading);
router.get('/sensors/latest', sensorController.getLatestReadings);
router.get('/sensors/location/:location', sensorController.getReadingsByLocation);
router.get('/sensors/:sensorId', sensorController.getReadingsBySensorId);
router.get('/sensors/stats', sensorController.getStatistics);

// Alert Routes
router.get('/alerts/active', sensorController.getActiveAlerts);
router.get('/alerts/history', sensorController.getAlertHistory);
router.post('/alerts/:alertId/resolve', sensorController.resolveAlert);
router.get('/alerts/stats', sensorController.getAlertStatistics);

export default router;