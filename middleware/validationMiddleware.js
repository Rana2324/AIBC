/**
 * Validation Middleware
 * Centralizes input validation for API endpoints
 */
import { ApiError } from './errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Validates sensor data object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const validateSensorData = (req, res, next) => {
  try {
    const data = req.body;
    const requiredFields = ['sensor_id', 'date', 'time', 'temperature_data', 'average_temp', 'status'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      logger.warn('Validation failed: Missing required fields', { 
        missingFields, 
        path: req.path 
      });
      
      throw new ApiError(400, 'Missing required fields', { missingFields });
    }
    
    // Validate data types
    if (typeof data.sensor_id !== 'string') {
      throw new ApiError(400, 'sensor_id must be a string');
    }
    
    if (typeof data.date !== 'string') {
      throw new ApiError(400, 'date must be a string');
    }
    
    if (typeof data.time !== 'string') {
      throw new ApiError(400, 'time must be a string');
    }
    
    if (!Array.isArray(data.temperature_data)) {
      throw new ApiError(400, 'temperature_data must be an array');
    }
    
    if (data.temperature_data.length === 0) {
      throw new ApiError(400, 'temperature_data cannot be empty');
    }
    
    if (typeof data.average_temp !== 'number') {
      throw new ApiError(400, 'average_temp must be a number');
    }
    
    if (typeof data.status !== 'string') {
      throw new ApiError(400, 'status must be a string');
    }
    
    // Data is valid, proceed
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError(400, 'Invalid sensor data', { originalError: error.message }));
    }
  }
};

/**
 * Validates sensor ID parameter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const validateSensorId = (req, res, next) => {
  try {
    const { sensorId } = req.params;
    
    if (!sensorId) {
      throw new ApiError(400, 'Sensor ID is required');
    }
    
    if (typeof sensorId !== 'string') {
      throw new ApiError(400, 'Sensor ID must be a string');
    }
    
    // Format validation (optional - customize as needed)
    const validFormat = /^sensor_\d+$/.test(sensorId);
    if (!validFormat) {
      throw new ApiError(400, 'Invalid sensor ID format. Expected format: sensor_X where X is a number');
    }
    
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError(400, 'Invalid sensor ID', { originalError: error.message }));
    }
  }
};

/**
 * Validates pagination parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const validatePagination = (req, res, next) => {
  try {
    // Get pagination params with defaults
    const limit = parseInt(req.query.limit) || 100;
    const page = parseInt(req.query.page) || 1;
    
    // Validate values
    if (limit < 1 || limit > 1000) {
      throw new ApiError(400, 'Limit must be between 1 and 1000');
    }
    
    if (page < 1) {
      throw new ApiError(400, 'Page must be at least 1');
    }
    
    // Add validated pagination to request object
    req.pagination = { limit, page };
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError(400, 'Invalid pagination parameters', { originalError: error.message }));
    }
  }
};