/**
 * Validation Utility Functions
 * Centralized validation utilities for the application
 */

/**
 * Check for missing required fields in an object
 * @param {Object} data - Object to check
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Array<string>} - Array of missing field names
 */
export const checkMissingFields = (data, requiredFields) => {
  return requiredFields.filter(field => !data[field]);
};

/**
 * Validate temperature data
 * @param {Array<number>} temperatureData - Array of temperature readings
 * @returns {Object} - Validation result with isValid and message
 */
export const validateTemperatureData = (temperatureData) => {
  if (!Array.isArray(temperatureData)) {
    return { 
      isValid: false, 
      message: 'Temperature data must be an array' 
    };
  }
  
  if (temperatureData.length === 0) {
    return { 
      isValid: false, 
      message: 'Temperature data array cannot be empty' 
    };
  }
  
  // Check if all values are numbers
  const invalidValues = temperatureData.filter(temp => 
    typeof temp !== 'number' || isNaN(temp)
  );
  
  if (invalidValues.length > 0) {
    return { 
      isValid: false, 
      message: 'All temperature values must be valid numbers' 
    };
  }
  
  return { isValid: true };
};

/**
 * Validate sensor ID format
 * @param {string} sensorId - Sensor ID to validate
 * @returns {Object} - Validation result with isValid and message
 */
export const validateSensorId = (sensorId) => {
  if (!sensorId || typeof sensorId !== 'string') {
    return { 
      isValid: false, 
      message: 'Sensor ID must be a non-empty string' 
    };
  }
  
  // Add any specific sensor ID format validation here
  // For example, check if it matches expected pattern like 'sensor_1'
  const validPattern = /^sensor_\d+$/;
  
  if (!validPattern.test(sensorId)) {
    return { 
      isValid: false, 
      message: 'Invalid sensor ID format. Expected format: sensor_X where X is a number' 
    };
  }
  
  return { isValid: true };
};

/**
 * Validate date string format (YYYY-MM-DD)
 * @param {string} dateStr - Date string to validate
 * @returns {Object} - Validation result with isValid and message
 */
export const validateDateFormat = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') {
    return { 
      isValid: false, 
      message: 'Date must be a non-empty string' 
    };
  }
  
  // Check if it matches YYYY-MM-DD format
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!datePattern.test(dateStr)) {
    return { 
      isValid: false, 
      message: 'Invalid date format. Expected format: YYYY-MM-DD' 
    };
  }
  
  // Check if it's a valid date
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { 
      isValid: false, 
      message: 'Invalid date value' 
    };
  }
  
  return { isValid: true };
};

/**
 * Validate time string format (HH:MM:SS)
 * @param {string} timeStr - Time string to validate
 * @returns {Object} - Validation result with isValid and message
 */
export const validateTimeFormat = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') {
    return { 
      isValid: false, 
      message: 'Time must be a non-empty string' 
    };
  }
  
  // Check if it matches HH:MM:SS format
  const timePattern = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
  
  if (!timePattern.test(timeStr)) {
    return { 
      isValid: false, 
      message: 'Invalid time format. Expected format: HH:MM:SS' 
    };
  }
  
  return { isValid: true };
};

export default {
  checkMissingFields,
  validateTemperatureData,
  validateSensorId,
  validateDateFormat,
  validateTimeFormat
};
