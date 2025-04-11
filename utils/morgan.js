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

/**
 * Configure Morgan HTTP request logger
 * @param {Object} options - Configuration options
 * @param {string} options.environment - Environment (development, production, etc.)
 * @returns {Object} - Morgan middleware configuration
 */
const setupMorgan = ({ environment = process.env.NODE_ENV || 'development' } = {}) => {
  // Basic Morgan format based on environment
  const basicFormat = environment === 'production' ? 'combined' : 'dev';

  // Standard Morgan setup with Winston integration
  const standardMorgan = morgan(basicFormat, { 
    stream: logger.stream 
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