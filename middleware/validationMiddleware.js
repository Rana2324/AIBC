/**
 * Validation Middleware
 * Centralized input validation for API endpoints
 */

import { ApiError } from './errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Validate sensor data in request body
 */
export const validateSensorData = (req, res, next) => {
  const {
    sensor_id,
    date,
    time,
    temperature_data,
    average_temp,
    status
  } = req.body;

  const missingFields = [];

  // Check required fields
  if (!sensor_id) missingFields.push('sensor_id');
  if (!date) missingFields.push('date');
  if (!time) missingFields.push('time');
  if (!temperature_data) missingFields.push('temperature_data');
  if (average_temp === undefined) missingFields.push('average_temp');
  if (!status) missingFields.push('status');

  if (missingFields.length > 0) {
    logger.warn('Validation failed: Missing required fields', {
      missingFields,
      path: req.path
    });

    return next(new ApiError(400, 'Missing required fields', { missingFields }));
  }

  // Validate data types
  if (typeof sensor_id !== 'string') {
    return next(new ApiError(400, 'sensor_id must be a string'));
  }

  if (typeof date !== 'string') {
    return next(new ApiError(400, 'date must be a string'));
  }

  if (typeof time !== 'string') {
    return next(new ApiError(400, 'time must be a string'));
  }

  if (!Array.isArray(temperature_data)) {
    return next(new ApiError(400, 'temperature_data must be an array'));
  }

  if (temperature_data.length === 0) {
    return next(new ApiError(400, 'temperature_data cannot be empty'));
  }

  if (typeof average_temp !== 'number') {
    return next(new ApiError(400, 'average_temp must be a number'));
  }

  if (typeof status !== 'string') {
    return next(new ApiError(400, 'status must be a string'));
  }

  next(); // Validation passed
};

/**
 * Validate sensorId in route parameters
 */
export const validateSensorId = (req, res, next) => {
  const { sensorId } = req.params;

  if (!sensorId) {
    return next(new ApiError(400, 'Sensor ID is required'));
  }

  if (typeof sensorId !== 'string') {
    return next(new ApiError(400, 'Sensor ID must be a string'));
  }

  next();
};
