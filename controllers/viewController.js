/**
 * View Controller
 * Handles rendering views for the temperature sensor monitoring system
 * Responsibilities:
 * - Render the main dashboard
 * - Handle error pages and not found responses
 * - Provide formatted data to templates
 */

import TemperatureSensor from '../models/temperatureSensor.js';
import Alert from '../models/alert.js';
import logger from '../utils/logger.js';

const viewController = {
  /**
   * Render the home page with sensor data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  renderHomePage: async (req, res) => {
    try {
      // Get active sensor IDs excluding 'test1'
      let sensorIds = await TemperatureSensor.distinct('sensor_id');
      sensorIds = sensorIds.filter(id => id !== 'test1');
      
      // Fetch the latest 100 sensor readings
      const latestReadings = await TemperatureSensor.find()
        .sort({ created_at: -1 })
        .limit(100);

      // Fetch the latest 10 alerts
      const latestAlerts = await Alert.find()
        .sort({ created_at: -1 })
        .limit(10);

      // Define system metrics (this was missing)
      const systemMetrics = {
        cpuUsage: 0,
        memoryUsage: 0,
        activeSensors: sensorIds.length,
        mongoConnected: true
      };

      // Render the homepage with data
      res.render('index', {
        title: '温度センサー監視システム',
        latestReadings: {
          data: latestReadings,
          alerts: latestAlerts
        },
        systemMetrics,
        sensorIds
      });

      // Log success
      logger.info('Home page rendered successfully', {
        readingsCount: latestReadings.length,
        alertsCount: latestAlerts.length,
        activeSensorIds: sensorIds
      });
    } catch (error) {
      // Log error and render error page
      logger.error('Error rendering home page:', error);
      res.status(500).render('error', {
        title: 'エラー | 温度センサー監視システム',
        message: 'Failed to load home page',
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  },

  /**
   * Render a 404 Not Found page
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  renderNotFound: (req, res) => {
    logger.debug('404 Not Found', { path: req.originalUrl });
    
    res.status(404).render('404', {
      title: 'ページが見つかりません | 温度センサー監視システム',
      message: `The requested page ${req.originalUrl} was not found`,
      returnUrl: '/'
    });
  },

  /**
   * Render the error page
   * @param {Object} err - Error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  renderErrorPage: (err, req, res) => {
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    
    // Log error details
    logger.error('Server error:', {
      error: err.message,
      stack: err.stack,
      path: req.originalUrl
    });

    // Render error page
    res.status(statusCode).render('error', {
      title: 'エラーが発生しました | 温度センサー監視システム',
      message: err.message,
      error: process.env.NODE_ENV === 'development' ? err : {},
      returnUrl: '/'
    });
  },
};

export default viewController;
