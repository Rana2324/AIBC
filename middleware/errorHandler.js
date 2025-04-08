/**
 * Error Handler Middleware
 * Handles various error scenarios in the application with appropriate responses
 */
import logger from '../utils/logger.js';

/**
 * Custom API Error class
 * Used for operational errors that should be sent to the client
 */
export class ApiError extends Error {
  /**
   * Create a new API error
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {Object} [metadata] - Additional error metadata
   */
  constructor(statusCode, message, metadata = {}) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.metadata = metadata;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not found handler middleware
 * Handles 404 errors for non-existent routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Not Found - ${req.originalUrl}`);
  next(error);
};

/**
 * Global error handler middleware
 * Processes all errors and returns appropriate responses
 * @param {Object} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const errorHandler = (err, req, res, next) => {
  // Set default status code if not available
  const statusCode = err.statusCode || res.statusCode === 200 ? 500 : res.statusCode;
  
  // Enhance error with request details for logging
  const errorDetails = {
    path: req.path,
    method: req.method,
    ip: req.ip,
    statusCode: statusCode,
    ...(err.metadata || {})
  };

  // Log the error with appropriate level based on severity
  if (statusCode >= 500) {
    logger.error(`${err.message}`, {
      stack: err.stack,
      ...errorDetails
    });
  } else if (statusCode >= 400) {
    logger.warn(`${err.message}`, errorDetails);
  }

  // Determine if this is an API request or a page request
  const isApiRequest = req.xhr || 
                       req.path.startsWith('/api') || 
                       req.get('Accept')?.includes('application/json');

  // For API requests, return JSON error response
  if (isApiRequest) {
    return res.status(statusCode).json({
      status: err.status || 'error',
      message: err.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
      ...(Object.keys(err.metadata || {}).length > 0 && { details: err.metadata })
    });
  }
  
  // For page requests, render error page
  // Import controller functions if needed
  const errorTitle = statusCode === 404 ? 'ページが見つかりません' : 'エラーが発生しました';
  
  return res.status(statusCode).render('error', {
    title: `${errorTitle} | 温度センサー監視システム`,
    message: err.message,
    error: process.env.NODE_ENV === 'production' ? {} : err,
    statusCode
  });
};

/**
 * Validation error handler
 * Processes validation errors from request data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const validationHandler = (req, res, next) => {
  // Implementation will depend on the validation library used
  // This is a placeholder for future implementation
  next();
};

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors without try/catch
 * @param {Function} fn - Async route handler function
 * @returns {Function} Middleware function with error handling
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};