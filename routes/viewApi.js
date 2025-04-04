
/**
 * View Routes
 * Handles all view endpoints for the temperature sensor application
 */
import express from 'express';
import sensorController from '../controllers/sensorController.js';

const router = express.Router();

// Dashboard
router.get('/', async (req, res) => {
  try {
    const [latestReadings, activeAlerts] = await Promise.all([
      sensorController.getLatestReadings({ query: { limit: 5 } }, { json: () => { } }),
      sensorController.getActiveAlerts({ query: {} }, { json: () => { } })
    ]);

    res.render('dashboard', {
      title: 'Temperature Sensor Dashboard',
      latestReadings: latestReadings.data,
      activeAlerts: activeAlerts.data
    });
  } catch (error) {
    res.render('error', {
      title: 'Error',
      message: 'Error loading dashboard data',
      error: error
    });
  }
});

// Sensors page
router.get('/sensors', async (req, res) => {
  try {
    const readings = await sensorController.getLatestReadings({ query: {} }, { json: () => { } });
    res.render('sensors', {
      title: 'Sensor Readings',
      readings: readings.data
    });
  } catch (error) {
    res.render('error', {
      title: 'Error',
      message: 'Error loading sensor data',
      error: error
    });
  }
});

// Alerts page
router.get('/alerts', async (req, res) => {
  try {
    const [activeAlerts, alertHistory] = await Promise.all([
      sensorController.getActiveAlerts({ query: {} }, { json: () => { } }),
      sensorController.getAlertHistory({ query: {} }, { json: () => { } })
    ]);

    res.render('alerts', {
      title: 'Alerts',
      activeAlerts: activeAlerts.data,
      alertHistory: alertHistory.data
    });
  } catch (error) {
    res.render('error', {
      title: 'Error',
      message: 'Error loading alert data',
      error: error
    });
  }
});

// Statistics page
router.get('/stats', async (req, res) => {
  try {
    const [sensorStats, alertStats] = await Promise.all([
      sensorController.getStatistics({ query: {} }, { json: () => { } }),
      sensorController.getAlertStatistics({ query: {} }, { json: () => { } })
    ]);

    res.render('stats', {
      title: 'Statistics',
      sensorStats: sensorStats.data,
      alertStats: alertStats.data
    });
  } catch (error) {
    res.render('error', {
      title: 'Error',
      message: 'Error loading statistics',
      error: error
    });
  }
});

// Settings page
router.get('/settings', (req, res) => {
  res.render('settings', {
    title: 'System Settings'
  });
});

// Error page route
router.get('/error', (req, res) => {
  res.render('error', {
    title: 'エラー',
    message: req.query.message || 'エラーが発生しました',
    error: req.query.error ? JSON.parse(req.query.error) : null
  });
});

// 404 page route (must be last)
router.get('*', (req, res) => {
  res.status(404).render('404', {
    title: 'ページが見つかりません',
    message: 'リクエストされたページは存在しません'
  });
});

export default router;