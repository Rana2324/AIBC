// errorHandler.js
import logger from '../utils/logger.js';

/**
 * Custom API Error class
 * For operational errors meant to be handled by the client
 */
export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Description of the error
   * @param {Object} [metadata={}] - Optional metadata for error context
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
 * Middleware: 404 Not Found Handler
 * Handles undefined routes
 */
export const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Not Found - ${req.originalUrl}`));
};

/**
 * Middleware: Global Error Handler
 * Handles all types of errors and sends appropriate responses
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);

  const errorDetails = {
    path: req.path,
    method: req.method,
    ip: req.ip,
    statusCode,
    ...(err.metadata || {})
  };

  // Log based on severity
  if (statusCode >= 500) {
    logger.error(err.message, { stack: err.stack, ...errorDetails });
  } else if (statusCode >= 400) {
    logger.warn(err.message, errorDetails);
  }

  // Determine if API or page request
  const isApiRequest = req.xhr ||
                       req.path.startsWith('/api') ||
                       req.get('Accept')?.includes('application/json');

  // Respond accordingly
  if (isApiRequest) {
    return res.status(statusCode).json({
      status: err.status || 'error',
      message: err.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
      ...(Object.keys(err.metadata || {}).length > 0 && { details: err.metadata })
    });
  }

  // Render error page for non-API requests
  const title = statusCode === 404 ? 'ページが見つかりません' : 'エラーが発生しました';

  return res.status(statusCode).render('error', {
    title: `${title} | 温度センサー監視システム`,
    message: err.message,
    error: process.env.NODE_ENV === 'production' ? {} : err,
    statusCode
  });
};



