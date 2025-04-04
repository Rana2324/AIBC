/**
 * Sensor Controller
 * Handles all sensor data operations
 */
import SensorData from '../models/SensorData.js';
import Alert from '../models/Alert.js';
import Setting from '../models/Setting.js';
import Personality from '../models/Personality.js';
import ModelUpdate from '../models/ModelUpdate.js';
import BlockchainRecord from '../models/BlockchainRecord.js';
import { mongoose, getConnectionStatus } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import { DataReceiver } from '../dataReceive.js';
import os from 'os';
import sensorService from '../services/SensorService.js';
import alertService from '../services/AlertService.js';

// Cache for active sensors
const activeSensors = new Map();
// Last data update time
let lastUpdateTime = Date.now();
// Cache for threshold values
let thresholdCache = {
  low: process.env.LOW_TEMP_THRESHOLD || 10,
  high: process.env.HIGH_TEMP_THRESHOLD || 30
};
// Cache for active connections
const activeConnections = new Set();

/**
 * Get sensor data
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getSensorData = async (req, res) => {
  try {
    const { sensorId, limit = 100 } = req.query;

    let query = {};
    if (sensorId) {
      query.sensorId = sensorId;
    }

    const data = await SensorData.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      count: data.length,
      sensorData: data
    });
  } catch (error) {
    logger.error('Error fetching sensor data:', error);
    throw new ApiError(500, 'Error fetching sensor data');
  }
};

/**
 * Get recent sensor data for real-time display
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getRecentSensorData = async (req, res) => {
  try {
    const { limit = 50, hours = 1 } = req.query;

    // Get data from the last N hours
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - parseInt(hours));

    // Find recent data across all sensors
    const recentData = await SensorData.find({
      timestamp: { $gte: hoursAgo.getTime() }
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    // Group data by sensorId for easier processing on client
    const groupedData = {};
    recentData.forEach(data => {
      if (!groupedData[data.sensorId]) {
        groupedData[data.sensorId] = [];
      }
      groupedData[data.sensorId].push(data);
    });

    return res.status(200).json({
      success: true,
      count: recentData.length,
      sensorCount: Object.keys(groupedData).length,
      sensorData: recentData,
      groupedData
    });
  } catch (error) {
    logger.error('Error fetching recent sensor data:', error);
    throw new ApiError(500, 'Error fetching recent sensor data');
  }
};

/**
 * Get sensor data by sensorId
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getSensorDataBySensorId = async (req, res) => {
  try {
    const { sensorId } = req.params;
    const { limit = 100, hours = 24 } = req.query;

    if (!sensorId) {
      throw new ApiError(400, 'Please provide a sensorId');
    }

    // Get data from the last N hours
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - parseInt(hours));

    const data = await SensorData.find({
      sensorId,
      timestamp: { $gte: hoursAgo.getTime() }
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      count: data.length,
      sensorData: data
    });
  } catch (error) {
    logger.error(`Error fetching sensor data for sensor ${req.params.sensorId}:`, error);
    throw error instanceof ApiError ? error : new ApiError(500, 'Error fetching sensor data');
  }
};

/**
 * Get sensor statistics
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getSensorStats = async (req, res) => {
  try {
    // Get count of all sensors
    const sensorIds = await SensorData.distinct('sensorId');

    // Get count of abnormal readings in the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const abnormalCount = await SensorData.countDocuments({
      isAbnormal: true,
      timestamp: { $gte: yesterday.getTime() }
    });

    // Get total reading count in the last 24 hours
    const totalReadings = await SensorData.countDocuments({
      timestamp: { $gte: yesterday.getTime() }
    });

    // Get min, max, avg temperatures across all sensors
    const aggregateResult = await SensorData.aggregate([
      {
        $match: {
          timestamp: { $gte: yesterday.getTime() },
          temperature_ave: { $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          min: { $min: "$temperature_ave" },
          max: { $max: "$temperature_ave" },
          avg: { $avg: "$temperature_ave" },
          count: { $sum: 1 }
        }
      }
    ]);

    const tempStats = aggregateResult.length > 0 ? aggregateResult[0] : {
      min: null,
      max: null,
      avg: null,
      count: 0
    };

    return res.status(200).json({
      success: true,
      stats: {
        sensorCount: sensorIds.length,
        abnormalCount,
        totalReadings,
        abnormalPercentage: totalReadings > 0 ? ((abnormalCount / totalReadings) * 100).toFixed(2) : 0,
        temperatures: {
          min: tempStats.min !== null ? tempStats.min.toFixed(2) : null,
          max: tempStats.max !== null ? tempStats.max.toFixed(2) : null,
          avg: tempStats.avg !== null ? tempStats.avg.toFixed(2) : null
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching sensor statistics:', error);
    throw new ApiError(500, 'Error fetching sensor statistics');
  }
};

/**
 * Create sensor data
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const createSensorData = async (req, res) => {
  try {
    const {
      sensorId,
      temperatures,
      acquisitionDate,
      acquisitionTime
    } = req.body;

    // Validate required fields
    if (!sensorId || !temperatures || !acquisitionDate || !acquisitionTime) {
      throw new ApiError(400, 'Please provide sensorId, temperatures, acquisitionDate, and acquisitionTime');
    }

    // Calculate average temperature (excluding null values)
    const validTemperatures = temperatures.filter(temp => temp !== null);
    const temperature_ave = validTemperatures.length > 0
      ? validTemperatures.reduce((sum, temp) => sum + temp, 0) / validTemperatures.length
      : null;

    // Check if temperature is abnormal using thresholds from cache
    const isAbnormal = temperature_ave !== null && (
      temperature_ave > thresholdCache.high ||
      temperature_ave < thresholdCache.low
    );

    // Create sensor data object
    const sensorData = new SensorData({
      sensorId,
      temperatures,
      temperature_ave,
      acquisitionDate,
      acquisitionTime,
      isAbnormal,
      timestamp: Date.now()
    });

    // Save to database
    await sensorData.save();

    // Update active sensors cache
    activeSensors.set(sensorId, {
      isActive: true,
      lastUpdate: Date.now()
    });

    // Update last update time
    lastUpdateTime = Date.now();

    // Emit to all connected clients via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('sensor-data-update', {
        type: 'insert',
        data: sensorData
      });
    }

    // Create alert if temperature is abnormal
    if (isAbnormal) {
      const alertReason = temperature_ave > thresholdCache.high
        ? `高温検出: ${temperature_ave.toFixed(1)}°C`
        : `低温検出: ${temperature_ave.toFixed(1)}°C`;

      const alert = new Alert({
        sensorId,
        date: acquisitionDate,
        time: acquisitionTime,
        alert_reason: alertReason,
        eventType: 'TEMPERATURE_ABNORMAL',
        timestamp: Date.now()
      });

      await alert.save();

      // Emit alert to all connected clients
      if (io) {
        io.emit('alert-update', {
          type: 'insert',
          data: alert
        });

        // Also emit critical alert for immediate attention
        io.emit('critical-alert', {
          sensor: sensorData,
          alert
        });
      }
    }

    return res.status(201).json({
      success: true,
      data: sensorData
    });
  } catch (error) {
    logger.error('Error creating sensor data:', error);
    throw error instanceof ApiError ? error : new ApiError(500, 'Error creating sensor data');
  }
};

/**
 * Get alerts
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getAlerts = async (req, res) => {
  try {
    const { sensorId, limit = 10 } = req.query;

    let query = {};
    if (sensorId) {
      query.sensorId = sensorId;
    }

    const alerts = await Alert.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    logger.error('Error fetching alerts:', error);
    throw new ApiError(500, 'Error fetching alerts');
  }
};

/**
 * Get recent alerts
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getRecentAlerts = async (req, res) => {
  try {
    const { limit = 20, hours = 24 } = req.query;

    // Get alerts from the last N hours
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - parseInt(hours));

    const alerts = await Alert.find({
      timestamp: { $gte: hoursAgo.getTime() }
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    logger.error('Error fetching recent alerts:', error);
    throw new ApiError(500, 'Error fetching recent alerts');
  }
};

/**
 * Get alerts by sensor ID
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getAlertsBySensorId = async (req, res) => {
  try {
    const { sensorId } = req.params;
    const { limit = 20, hours = 24 } = req.query;

    if (!sensorId) {
      throw new ApiError(400, 'Please provide a sensorId');
    }

    // Get alerts from the last N hours
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - parseInt(hours));

    const alerts = await Alert.find({
      sensorId,
      timestamp: { $gte: hoursAgo.getTime() }
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (error) {
    logger.error(`Error fetching alerts for sensor ${req.params.sensorId}:`, error);
    throw error instanceof ApiError ? error : new ApiError(500, 'Error fetching alerts');
  }
};

/**
 * Create alert
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const createAlert = async (req, res) => {
  try {
    const { sensorId, date, time, alert_reason, eventType } = req.body;

    // Validate required fields
    if (!sensorId || !date || !time || !alert_reason) {
      throw new ApiError(400, 'Please provide sensorId, date, time, and alert_reason');
    }

    // Create alert object
    const alert = new Alert({
      sensorId,
      date,
      time,
      alert_reason,
      eventType: eventType || 'GENERAL_ALERT',
      timestamp: Date.now()
    });

    // Save to database
    await alert.save();

    // Emit to all connected clients via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('alert-update', {
        type: 'insert',
        data: alert
      });
    }

    return res.status(201).json({
      success: true,
      data: alert
    });
  } catch (error) {
    logger.error('Error creating alert:', error);
    throw error instanceof ApiError ? error : new ApiError(500, 'Error creating alert');
  }
};

/**
 * Get settings
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getSettings = async (req, res) => {
  try {
    const { sensorId, limit = 10 } = req.query;

    let query = {};
    if (sensorId) {
      query.sensorId = sensorId;
    }

    const settings = await Setting.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      count: settings.length,
      settings
    });
  } catch (error) {
    logger.error('Error fetching settings:', error);
    throw new ApiError(500, 'Error fetching settings');
  }
};

/**
 * Get temperature thresholds
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getThresholds = async (req, res) => {
  try {
    // First check if we have settings in the database
    const settingsRecord = await Setting.findOne({
      content: { $regex: /threshold/i }
    }).sort({ timestamp: -1 });

    // If we have settings, parse them and update the cache
    if (settingsRecord) {
      try {
        // Try to extract threshold values from content
        const content = JSON.parse(settingsRecord.content);
        if (content.thresholds) {
          thresholdCache = {
            low: content.thresholds.low || thresholdCache.low,
            high: content.thresholds.high || thresholdCache.high
          };
        }
      } catch (err) {
        logger.warn('Failed to parse threshold settings:', err);
      }
    }

    return res.status(200).json({
      success: true,
      thresholds: thresholdCache
    });
  } catch (error) {
    logger.error('Error fetching threshold settings:', error);
    throw new ApiError(500, 'Error fetching threshold settings');
  }
};

/**
 * Update temperature thresholds
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const updateThresholds = async (req, res) => {
  try {
    const { low, high } = req.body;

    // Validate thresholds
    if (low === undefined && high === undefined) {
      throw new ApiError(400, 'Please provide at least one threshold (low or high)');
    }

    // Update the thresholds in the cache
    if (low !== undefined) {
      thresholdCache.low = parseFloat(low);
    }

    if (high !== undefined) {
      thresholdCache.high = parseFloat(high);
    }

    // Validate that low is less than high
    if (thresholdCache.low >= thresholdCache.high) {
      throw new ApiError(400, 'Low threshold must be less than high threshold');
    }

    // Save the new thresholds to the database for persistence
    const now = new Date();
    const setting = new Setting({
      sensorId: 'global',
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      content: JSON.stringify({ thresholds: thresholdCache }),
      timestamp: Date.now()
    });

    await setting.save();

    // Emit to all connected clients via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('threshold-update', thresholdCache);
    }

    return res.status(200).json({
      success: true,
      thresholds: thresholdCache,
      message: 'Temperature thresholds updated successfully'
    });
  } catch (error) {
    logger.error('Error updating threshold settings:', error);
    throw error instanceof ApiError ? error : new ApiError(500, 'Error updating threshold settings');
  }
};

/**
 * Update settings
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const updateSettings = async (req, res) => {
  try {
    const { sensorId, date, time, content } = req.body;

    // Validate required fields
    if (!sensorId || !date || !time || !content) {
      throw new ApiError(400, 'Please provide sensorId, date, time, and content');
    }

    // Create settings object
    const setting = new Setting({
      sensorId,
      date,
      time,
      content,
      timestamp: Date.now()
    });

    // Save to database
    await setting.save();

    // Emit to all connected clients via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('settings-update', setting);
    }

    return res.status(200).json({
      success: true,
      data: setting
    });
  } catch (error) {
    logger.error('Error updating settings:', error);
    throw new ApiError(500, 'Error updating settings');
  }
};

/**
 * Get personality data
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getPersonality = async (req, res) => {
  try {
    const { sensorId, limit = 10 } = req.query;

    let query = {};
    if (sensorId) {
      query.sensorId = sensorId;
    }

    const personality = await Personality.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      count: personality.length,
      personality
    });
  } catch (error) {
    logger.error('Error fetching personality data:', error);
    throw new ApiError(500, 'Error fetching personality data');
  }
};

/**
 * Update personality data
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const updatePersonality = async (req, res) => {
  try {
    const { sensorId, date, time, content } = req.body;

    // Validate required fields
    if (!sensorId || !date || !time || !content) {
      throw new ApiError(400, 'Please provide sensorId, date, time, and content');
    }

    // Create personality object
    const personality = new Personality({
      sensorId,
      date,
      time,
      content,
      timestamp: Date.now()
    });

    // Save to database
    await personality.save();

    // Emit to all connected clients via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('personality-update', personality);
    }

    return res.status(200).json({
      success: true,
      data: personality
    });
  } catch (error) {
    logger.error('Error updating personality:', error);
    throw new ApiError(500, 'Error updating personality');
  }
};

/**
 * Get server stats
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getServerStats = async (req, res) => {
  try {
    // Clean up inactive sensors
    const now = Date.now();
    for (const [sensorId, data] of activeSensors) {
      // Consider a sensor inactive if no update in 5 minutes
      if (now - data.lastUpdate > 5 * 60 * 1000) {
        data.isActive = false;
      }
    }

    // Count active sensors
    const activeCount = Array.from(activeSensors.values())
      .filter(data => data.isActive)
      .length;

    // Get personality comparison data
    const personalityComparison = await getPersonalityComparisonData(10);

    // Get model update history
    const modelUpdates = await getModelUpdateHistory(10);

    // Get blockchain/IPFS records
    const blockchainRecords = await getBlockchainRecordHistory(10);

    // Build server stats object
    const serverStats = {
      mongoDbConnected: getConnectionStatus(),
      totalSensors: activeSensors.size,
      activeSensors: activeCount,
      lastUpdateTime,
      personalityComparison,
      modelUpdates,
      blockchainRecords
    };

    return res.status(200).json({
      success: true,
      serverStats
    });
  } catch (error) {
    logger.error('Error fetching server stats:', error);
    throw new ApiError(500, 'Error fetching server stats');
  }
};

/**
 * Get system health information
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getSystemHealth = async (req, res) => {
  try {
    // Get system info
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpuUsage = os.loadavg();

    // Check MongoDB connection status
    const mongoConnected = mongoose.connection.readyState === 1;

    // Get MongoDB statistics if connected
    let dbStats = null;
    if (mongoConnected) {
      try {
        dbStats = await mongoose.connection.db.stats();
      } catch (err) {
        logger.warn('Failed to get MongoDB stats:', err);
      }
    }

    // Get data storage statistics
    const lastDay = await SensorData.countDocuments({
      timestamp: { $gte: Date.now() - (24 * 60 * 60 * 1000) }
    });

    const lastWeek = await SensorData.countDocuments({
      timestamp: { $gte: Date.now() - (7 * 24 * 60 * 60 * 1000) }
    });

    // Check disk space (simplified)
    const diskStats = {
      available: 'OS API not available on Yocto Linux',
      used: 'OS API not available on Yocto Linux',
      percentUsed: 'N/A'
    };

    return res.status(200).json({
      success: true,
      health: {
        system: {
          uptime: uptime,
          uptimeFormatted: formatUptime(uptime),
          memory: {
            totalMB: Math.round(totalMem / (1024 * 1024)),
            freeMB: Math.round(freeMem / (1024 * 1024)),
            usedMB: Math.round((totalMem - freeMem) / (1024 * 1024)),
            usagePercent: Math.round(((totalMem - freeMem) / totalMem) * 100)
          },
          processMemory: {
            rssMB: Math.round(memoryUsage.rss / (1024 * 1024)),
            heapTotalMB: Math.round(memoryUsage.heapTotal / (1024 * 1024)),
            heapUsedMB: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
            externalMB: Math.round(memoryUsage.external / (1024 * 1024))
          },
          cpu: {
            loadAvg1Min: cpuUsage[0],
            loadAvg5Min: cpuUsage[1],
            loadAvg15Min: cpuUsage[2]
          },
          platform: {
            os: os.platform(),
            arch: os.arch(),
            release: os.release()
          },
          diskSpace: diskStats
        },
        database: {
          connected: mongoConnected,
          connectionString: maskConnectionString(process.env.MONGODB_URI || 'mongodb://localhost:27017/sensordata'),
          stats: dbStats,
          collections: {
            sensorData: {
              lastDay,
              lastWeek,
              total: dbStats?.objects || 'N/A'
            }
          }
        },
        application: {
          activeConnections: activeConnections.size,
          sensors: {
            total: activeSensors.size,
            active: Array.from(activeSensors.values()).filter(data => data.isActive).length
          },
          environment: process.env.NODE_ENV || 'development',
          version: process.env.APP_VERSION || '1.0.0'
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching system health:', error);
    throw new ApiError(500, 'Error fetching system health');
  }
};

/**
 * Format uptime in human readable format
 * @param {number} uptime - Uptime in seconds
 * @returns {string} - Formatted uptime string
 */
function formatUptime(uptime) {
  const days = Math.floor(uptime / (24 * 60 * 60));
  const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((uptime % (60 * 60)) / 60);
  const seconds = Math.floor(uptime % 60);

  let result = '';
  if (days > 0) result += `${days}d `;
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m `;
  result += `${seconds}s`;

  return result;
}

/**
 * Mask sensitive information in MongoDB connection string
 * @param {string} connectionString - MongoDB connection string
 * @returns {string} - Masked connection string
 */
function maskConnectionString(connectionString) {
  try {
    // Replace password in connection string with asterisks
    return connectionString.replace(/\/\/(.*):(.*)@/, '//******:******@');
  } catch (err) {
    return 'Invalid connection string';
  }
}

/**
 * Get information about active connections
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getActiveConnections = async (req, res) => {
  try {
    const io = req.app.get('io');
    let socketDetails = [];

    // Get details of connected sockets if io is available
    if (io) {
      const sockets = await io.fetchSockets();

      socketDetails = sockets.map(socket => ({
        id: socket.id,
        transport: socket.conn.transport.name,
        connectedAt: new Date(socket.handshake.issued),
        ip: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent'],
        rooms: Array.from(socket.rooms)
      }));
    }

    return res.status(200).json({
      success: true,
      connections: {
        active: activeConnections.size,
        sockets: socketDetails
      }
    });
  } catch (error) {
    logger.error('Error fetching active connections:', error);
    throw new ApiError(500, 'Error fetching active connections');
  }
};

/**
 * Get personality comparison data
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Array>} - Personality comparison data
 */
const getPersonalityComparisonData = async (limit = 10) => {
  try {
    // Simplified implementation - in a real app, this would query a separate collection
    // Here we'll just extract from the personality records
    const records = await Personality.find()
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    return records.map(record => ({
      date: record.date,
      time: record.time,
      sensorId: record.sensorId,
      difference: Math.random() * 10, // Simulated difference value
      aiOutput: '正常範囲内の変動です'
    }));
  } catch (error) {
    logger.error('Error getting personality comparison data:', error);
    return [];
  }
};

/**
 * Get model update history
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Array>} - Model update history
 */
const getModelUpdateHistory = async (limit = 10) => {
  try {
    return await ModelUpdate.find()
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
  } catch (error) {
    logger.error('Error getting model update history:', error);
    return [];
  }
};

/**
 * Get blockchain record history
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Array>} - Blockchain record history
 */
const getBlockchainRecordHistory = async (limit = 10) => {
  try {
    return await BlockchainRecord.find()
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
  } catch (error) {
    logger.error('Error getting blockchain record history:', error);
    return [];
  }
};

/**
 * Get personality comparison data
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getPersonalityComparison = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const personalityComparison = await getPersonalityComparisonData(limit);

    return res.status(200).json({
      success: true,
      count: personalityComparison.length,
      personalityComparison
    });
  } catch (error) {
    logger.error('Error fetching personality comparison data:', error);
    throw new ApiError(500, 'Error fetching personality comparison data');
  }
};

/**
 * Add personality comparison data
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const addPersonalityComparison = async (req, res) => {
  try {
    const { sensorId, date, time, difference, aiOutput } = req.body;

    // Validate required fields
    if (!sensorId || !date || !time || difference === undefined) {
      throw new ApiError(400, 'Please provide sensorId, date, time, and difference');
    }

    // Create a personality record to store the comparison
    const personality = new Personality({
      sensorId,
      date,
      time,
      content: `個性比較: 差異値 ${difference.toFixed(2)}`,
      timestamp: Date.now()
    });

    // Save to database
    await personality.save();

    // Emit to all connected clients via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('personality-comparison-update', {
        sensorId,
        date,
        time,
        difference,
        aiOutput
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        sensorId,
        date,
        time,
        difference,
        aiOutput
      }
    });
  } catch (error) {
    logger.error('Error adding personality comparison:', error);
    throw error instanceof ApiError ? error : new ApiError(500, 'Error adding personality comparison');
  }
};

/**
 * Get model updates
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getModelUpdates = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const modelUpdates = await getModelUpdateHistory(limit);

    return res.status(200).json({
      success: true,
      count: modelUpdates.length,
      modelUpdates
    });
  } catch (error) {
    logger.error('Error fetching model updates:', error);
    throw new ApiError(500, 'Error fetching model updates');
  }
};

/**
 * Create model update
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const createModelUpdate = async (req, res) => {
  try {
    const { modelId, date, time, content, aiOutput } = req.body;

    // Validate required fields
    if (!modelId || !date || !time || !content) {
      throw new ApiError(400, 'Please provide modelId, date, time, and content');
    }

    // Create model update object
    const modelUpdate = new ModelUpdate({
      modelId,
      date,
      time,
      content,
      aiOutput: aiOutput || '',
      timestamp: Date.now()
    });

    // Save to database
    await modelUpdate.save();

    // Emit to all connected clients via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('model-update', modelUpdate);
    }

    return res.status(201).json({
      success: true,
      data: modelUpdate
    });
  } catch (error) {
    logger.error('Error creating model update:', error);
    throw new ApiError(500, 'Error creating model update');
  }
};

/**
 * Get blockchain records
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getBlockchainRecords = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const blockchainRecords = await getBlockchainRecordHistory(limit);

    return res.status(200).json({
      success: true,
      count: blockchainRecords.length,
      blockchainRecords
    });
  } catch (error) {
    logger.error('Error fetching blockchain records:', error);
    throw new ApiError(500, 'Error fetching blockchain records');
  }
};

/**
 * Create blockchain record
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const createBlockchainRecord = async (req, res) => {
  try {
    const { modelId, date, time, ipfsCid, txHash, status } = req.body;

    // Validate required fields
    if (!modelId || !date || !time) {
      throw new ApiError(400, 'Please provide modelId, date, and time');
    }

    // Create blockchain record object
    const blockchainRecord = new BlockchainRecord({
      modelId,
      date,
      time,
      ipfsCid: ipfsCid || '',
      txHash: txHash || '',
      status: status || '処理中',
      timestamp: Date.now()
    });

    // Save to database
    await blockchainRecord.save();

    // Emit to all connected clients via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('blockchain-record', blockchainRecord);
    }

    return res.status(201).json({
      success: true,
      data: blockchainRecord
    });
  } catch (error) {
    logger.error('Error creating blockchain record:', error);
    throw new ApiError(500, 'Error creating blockchain record');
  }
};

/**
 * Receive data from Yocto Linux device
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const receiveData = async (req, res) => {
  try {
    // Track the connection
    const clientIp = req.ip || req.connection.remoteAddress;
    activeConnections.add(clientIp);

    // Access the data receiver class
    const io = req.app.get('io');
    const dataReceiver = new DataReceiver({
      lowThreshold: thresholdCache.low,
      highThreshold: thresholdCache.high
    }, io);

    // Process incoming data
    const result = await dataReceiver.processIncomingData(req.body);

    // Update active sensors cache
    if (result.success && result.sensorId) {
      activeSensors.set(result.sensorId, {
        isActive: true,
        lastUpdate: Date.now()
      });
    }

    // Update last update time
    lastUpdateTime = Date.now();

    return res.status(200).json({
      success: true,
      message: 'Data received and processed',
      data: result
    });
  } catch (error) {
    logger.error('Error receiving data:', error);
    throw error instanceof ApiError ? error : new ApiError(500, 'Error receiving data');
  }
};

class SensorController {
  async createReading(req, res) {
    try {
      const sensorData = await sensorService.createSensorReading(req.body);
      res.status(201).json({
        success: true,
        data: sensorData
      });
    } catch (error) {
      logger.error('Error in createReading:', error);
      res.status(500).json({
        success: false,
        error: 'Error creating sensor reading'
      });
    }
  }

  async getLatestReadings(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const readings = await sensorService.getLatestReadings(limit);
      res.json({
        success: true,
        data: readings
      });
    } catch (error) {
      logger.error('Error in getLatestReadings:', error);
      res.status(500).json({
        success: false,
        error: 'Error fetching latest readings'
      });
    }
  }

  async getReadingsByLocation(req, res) {
    try {
      const { location } = req.params;
      const { startDate, endDate } = req.query;
      const readings = await sensorService.getReadingsByLocation(location, startDate, endDate);
      res.json({
        success: true,
        data: readings
      });
    } catch (error) {
      logger.error('Error in getReadingsByLocation:', error);
      res.status(500).json({
        success: false,
        error: 'Error fetching readings by location'
      });
    }
  }

  async getReadingsBySensorId(req, res) {
    try {
      const { sensorId } = req.params;
      const { startDate, endDate } = req.query;
      const readings = await sensorService.getReadingsBySensorId(sensorId, startDate, endDate);
      res.json({
        success: true,
        data: readings
      });
    } catch (error) {
      logger.error('Error in getReadingsBySensorId:', error);
      res.status(500).json({
        success: false,
        error: 'Error fetching readings by sensor ID'
      });
    }
  }

  async getStatistics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const stats = await sensorService.getStatistics(startDate, endDate);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error in getStatistics:', error);
      res.status(500).json({
        success: false,
        error: 'Error fetching statistics'
      });
    }
  }

  async getActiveAlerts(req, res) {
    try {
      const { location } = req.query;
      const alerts = await alertService.getActiveAlerts(location);
      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      logger.error('Error in getActiveAlerts:', error);
      res.status(500).json({
        success: false,
        error: 'Error fetching active alerts'
      });
    }
  }

  async getAlertHistory(req, res) {
    try {
      const { startDate, endDate, location } = req.query;
      const alerts = await alertService.getAlertHistory(startDate, endDate, location);
      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      logger.error('Error in getAlertHistory:', error);
      res.status(500).json({
        success: false,
        error: 'Error fetching alert history'
      });
    }
  }

  async resolveAlert(req, res) {
    try {
      const { alertId } = req.params;
      const alert = await alertService.resolveAlert(alertId);
      res.json({
        success: true,
        data: alert
      });
    } catch (error) {
      logger.error('Error in resolveAlert:', error);
      res.status(500).json({
        success: false,
        error: 'Error resolving alert'
      });
    }
  }

  async getAlertStatistics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const stats = await alertService.getAlertStatistics(startDate, endDate);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error in getAlertStatistics:', error);
      res.status(500).json({
        success: false,
        error: 'Error fetching alert statistics'
      });
    }
  }
}

export default new SensorController();