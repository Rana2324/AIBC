/**
 * View Controller
 * Handles rendering views for the temperature sensor monitoring system
 * Responsible for:
 * - Rendering the main dashboard
 * - Handling error pages and not found responses
 * - Providing formatted data to templates
 */
import TemperatureSensor from '../models/temperatureSensor.js';
import Alert from '../models/alert.js';
import logger from '../utils/logger.js';

/**
 * Render the home page with sensor data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const renderHomePage = async (req, res) => {
  try {
    // Get active sensor IDs
    const sensorIds = await TemperatureSensor.distinct('sensor_id');
    
    // Fetch the latest sensor readings from MongoDB (100 records as requested)
    const latestReadings = await TemperatureSensor.find()
      .sort({ created_at: -1 })
      .limit(100);
    
    // Fetch the latest 10 alerts
    const latestAlerts = await Alert.find()
      .sort({ created_at: -1 })
      .limit(10);
    
    // Get system metrics
    const systemMetrics = {
      sensorCount: sensorIds.length,
      alertCount: await Alert.countDocuments(),
      lastUpdated: new Date()
    };
    
    // Render the index page with the data
    res.render('index', { 
      title: '温度センサー監視システム',
      latestReadings: {
        data: latestReadings,
        alerts: latestAlerts
      },
      systemMetrics,
      sensorIds
    });
    
    logger.info('Home page rendered successfully', { 
      readingsCount: latestReadings.length,
      alertsCount: latestAlerts.length,
      activeSensorIds: sensorIds
    });
  } catch (error) {
    logger.error('Error rendering home page:', error);
    res.status(500).render('error', { 
      title: 'エラー | 温度センサー監視システム',
      message: 'Failed to load home page', 
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Render a 404 Not Found page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const renderNotFound = (req, res) => {
  logger.debug('404 Not Found', { path: req.originalUrl });
  
  res.status(404).render('404', { 
    title: 'ページが見つかりません | 温度センサー監視システム',
    message: `The requested page ${req.originalUrl} was not found`,
    returnUrl: '/'
  });
};

/**
 * Render the error page
 * @param {Object} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const renderErrorPage = (err, req, res) => {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  logger.error('Server error:', { 
    error: err.message, 
    stack: err.stack,
    path: req.originalUrl
  });
  
  res.status(statusCode).render('error', {
    title: 'エラーが発生しました | 温度センサー監視システム',
    message: err.message,
    error: process.env.NODE_ENV === 'development' ? err : {},
    returnUrl: '/'
  });
};

/**
 * Render the about/system information page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const renderAboutPage = async (req, res) => {
  try {
    const systemInfo = {
      uptime: formatUptime(process.uptime()),
      nodeVersion: process.version,
      serverTime: new Date().toLocaleString(),
      memory: formatMemory(process.memoryUsage()),
      sensors: {
        total: await TemperatureSensor.countDocuments(),
        active: await TemperatureSensor.distinct('sensor_id').length
      },
      alerts: {
        total: await Alert.countDocuments()
      }
    };
    
    res.render('about', {
      title: 'システム情報 | 温度センサー監視システム',
      systemInfo
    });
  } catch (error) {
    logger.error('Error rendering about page:', error);
    res.status(500).render('error', {
      title: 'エラー | 温度センサー監視システム',
      message: 'Failed to load system information',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Format uptime into human-readable format
 * @private
 * @param {number} uptimeSeconds - Uptime in seconds
 * @returns {string} Formatted uptime string
 */
function formatUptime(uptimeSeconds) {
  const days = Math.floor(uptimeSeconds / (24 * 60 * 60));
  const hours = Math.floor((uptimeSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((uptimeSeconds % (60 * 60)) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);
  
  let result = '';
  if (days > 0) result += `${days}日 `;
  if (hours > 0 || days > 0) result += `${hours}時間 `;
  if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}分 `;
  result += `${seconds}秒`;
  
  return result;
}

/**
 * Format memory usage into human-readable format
 * @private
 * @param {Object} memoryUsage - Node.js memory usage object
 * @returns {Object} Formatted memory usage object
 */
function formatMemory(memoryUsage) {
  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };
  
  return {
    rss: formatBytes(memoryUsage.rss),
    heapTotal: formatBytes(memoryUsage.heapTotal),
    heapUsed: formatBytes(memoryUsage.heapUsed),
    external: formatBytes(memoryUsage.external)
  };
}
