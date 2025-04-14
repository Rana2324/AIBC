/**
 * Morgan HTTP request logger configuration
 * Configures Morgan middleware for HTTP request logging with Winston integration
 * Features:
 * - Different formats based on environment
 * - Winston integration
 * - Detailed request logging in development mode
 * - JSON format for structured logging
 */
import morgan from 'morgan';
import logger from './logger.js';
import express from 'express';

/**
 * Configure Morgan HTTP request logger
 * @param {Object} options - Configuration options
 * @param {string} options.environment - Environment (development, production, etc.)
 * @returns {Object} - Morgan middleware configuration
 */
const setupMorgan = ({ environment = process.env.NODE_ENV || 'development' } = {}) => {
  // Basic Morgan format based on environment
  const basicFormat = environment === 'production' ? 'combined' : 'dev';

  // Custom format exactly matching the requested log format
  const customFormat = (tokens, req, res) => {
    // Get current timestamp in the exact format requested
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/T/, ' ')
      .replace(/\..+/, '');
    
    // Get the request method and URL as the main message
    const method = tokens.method(req, res);
    const url = tokens.url(req, res);
    const message = `${method} ${url}`;
    
    // Build key-value pairs for all relevant information
    const pairs = [
      `status=${tokens.status(req, res)}`,
      `duration=${tokens['response-time'](req, res)}ms`
    ];
    
    // Add sensor ID if available
    if (req.sensorId) {
      pairs.push(`sensorId=${req.sensorId}`);
    }
    
    // Format the log message exactly as requested with colored INFO level
    // [2025-04-14 14:01:16] [INFO] POST /api/data | status=201 | duration=1.309ms | sensorId=sensor_1
    // Add ANSI color codes for the INFO level (blue color)
    const coloredInfo = '\x1b[36m[INFO]\x1b[0m'; // Cyan color for INFO
    return `[${timestamp}] ${coloredInfo} ${message} | ${pairs.join(' | ')}`;
  };
  
  // Standard Morgan setup with custom stream to handle the formatted logs
  const standardMorgan = morgan(customFormat, { 
    stream: {
      write: (message) => {
        // Use logger.info directly to ensure proper formatting
        // This bypasses Morgan's default formatting without adding the ']' character
        if (message && message.trim()) {
          // Using console.log directly to avoid the leading ']' character
          // while still maintaining the desired format
          console.log(message.trim());
        }
      }
    }
  });

  // Detailed JSON logging for development
  const detailedMorgan = morgan((tokens, req, res) => {
    return JSON.stringify({
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: Number(tokens.status(req, res)),
      'content-length': tokens.res(req, res, 'content-length'),
      'response-time': Number(tokens['response-time'](req, res)),
      referrer: tokens.referrer(req, res),
      'user-agent': tokens['user-agent'](req, res),
      remote: tokens['remote-addr'](req, res),
      timestamp: new Date().toISOString()
    }, null, 2);
  }, {
    stream: {
      write: (message) => {
        logger.debug('HTTP Request Details', JSON.parse(message));
      }
    }
  });

  return {
    // Standard Morgan middleware
    standard: standardMorgan,

    // Detailed Morgan middleware for development
    detailed: environment === 'development' ? detailedMorgan : (req, res, next) => next(),

    // Apply both standard and detailed (if in development)
    combined: (req, res, next) => {
      standardMorgan(req, res, (err) => {
        if (err) return next(err);
        if (environment === 'development') {
          detailedMorgan(req, res, next);
        } else {
          next();
        }
      });
    },

    // Custom token setup for additional information
    setup: (app) => {
      // Add custom tokens to Morgan if needed
      morgan.token('session-id', (req) => req.sessionID || 'no-session');
      morgan.token('user-id', (req) => req.user ? req.user.id : 'anonymous');
      morgan.token('request-body', (req) => {
        if (req.method === 'GET') return '';
        
        // Don't log sensitive information
        const sanitized = { ...req.body };
        if (sanitized.password) sanitized.password = '[REDACTED]';
        
        return JSON.stringify(sanitized);
      });
      
      // Add custom token for sensor ID
      morgan.token('sensor-id', (req) => {
        return req.sensorId ? `sensorId: ${req.sensorId}` : '';
      });
      
      // Apply the Morgan middleware to the app
      app.use(standardMorgan);
      
      if (environment === 'development') {
        app.use(detailedMorgan);
      }
      
    //   logger.info('Morgan HTTP logging initialized', { environment });
    }
  };
};

export default setupMorgan;