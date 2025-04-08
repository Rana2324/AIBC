/**
 * Client-side Logger
 * Real-time logger that sends logs to the server via WebSocket
 * and provides local console logging
 * 
 * Features:
 * - Real-time integration with server via WebSocket
 * - Local console logging with formatting
 * - Multiple log levels (error, warn, info, etc.)
 * - Buffering when disconnected
 * - Customizable log level
 */

// Check if socket.io is available
if (typeof io === 'undefined') {
  console.warn('Socket.io not found, real-time logging will be disabled');
}

// Logger configuration
const loggerConfig = {
  enabled: true,
  level: 'info', // default level
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
  },
  // Map log levels to console methods
  consoleMethods: {
    error: 'error',
    warn: 'warn',
    info: 'info',
    http: 'log',
    verbose: 'log',
    debug: 'debug',
    silly: 'log'
  },
  // Color codes for different log levels in console
  colors: {
    error: 'color: #ff0000; font-weight: bold',
    warn: 'color: #ff9900; font-weight: bold',
    info: 'color: #0099ff',
    http: 'color: #00cc00',
    verbose: 'color: #999999',
    debug: 'color: #9900cc',
    silly: 'color: #cccccc'
  },
  // Store logs when disconnected to send later (up to maxBufferSize)
  bufferLogs: true,
  maxBufferSize: 100,
  // Pause time in ms when buffer is full before allowing more logs
  bufferPauseTime: 5000
};

// Log buffer for disconnected state
const logBuffer = [];
let bufferPaused = false;

// Create the enhanced logger
window.logger = (function() {
  // Create logger object with all log levels
  const logger = {};
  
  // Current socket instance
  let socket = null;
  
  // Initialize socket connection
  const initSocket = function() {
    // Use existing socket if available (from index.js)
    if (window.socket) {
      socket = window.socket;
      console.log('Logger: Using existing socket connection');
    } else if (typeof io !== 'undefined') {
      socket = io();
      window.socket = socket;
      console.log('Logger: Created new socket connection');
    }
    
    // Set up socket event handlers
    if (socket) {
      socket.on('connect', function() {
        console.log('Logger: Connected to server');
        // Send any buffered logs
        flushBuffer();
      });
      
      socket.on('disconnect', function() {
        console.log('Logger: Disconnected from server');
      });
    }
  };
  
  // Flush buffered logs when connection is restored
  const flushBuffer = function() {
    if (logBuffer.length > 0 && socket && socket.connected) {
      console.log(`Logger: Sending ${logBuffer.length} buffered log(s)`);
      
      while (logBuffer.length > 0) {
        const log = logBuffer.shift();
        sendLog(log.level, log.message, log.meta);
      }
    }
  };
  
  // Add log to buffer when disconnected
  const bufferLog = function(level, message, meta) {
    if (logBuffer.length >= loggerConfig.maxBufferSize) {
      if (!bufferPaused) {
        bufferPaused = true;
        setTimeout(function() {
          bufferPaused = false;
        }, loggerConfig.bufferPauseTime);
        console.warn(`Logger: Buffer full (${loggerConfig.maxBufferSize} entries), pausing for ${loggerConfig.bufferPauseTime}ms`);
      }
      return false;
    }
    
    logBuffer.push({ level, message, meta });
    return true;
  };
  
  // Send log to server via socket
  const sendLog = function(level, message, meta) {
    if (socket && socket.connected) {
      socket.emit('client-log', {
        level: level,
        message: message,
        meta: meta || {},
        timestamp: new Date().toISOString()
      });
      return true;
    } else if (loggerConfig.bufferLogs && !bufferPaused) {
      return bufferLog(level, message, meta);
    }
    return false;
  };
  
  // Create log method for each level
  Object.keys(loggerConfig.levels).forEach(level => {
    logger[level] = function(message, meta) {
      // Skip if logging is disabled or level is higher than current
      if (!loggerConfig.enabled || loggerConfig.levels[level] > loggerConfig.levels[loggerConfig.level]) {
        return;
      }
      
      // Format console output
      const consoleMethod = loggerConfig.consoleMethods[level];
      const timestamp = new Date().toLocaleTimeString();
      
      // Log to console with formatting
      if (typeof console[consoleMethod] === 'function') {
        console[consoleMethod](
          `%c[${timestamp}] [${level.toUpperCase()}]`,
          loggerConfig.colors[level],
          message,
          meta || ''
        );
      }
      
      // Send to server
      sendLog(level, message, meta);
    };
  });
  
  // Set the logging level
  logger.setLevel = function(level) {
    if (loggerConfig.levels[level] !== undefined) {
      loggerConfig.level = level;
      console.log(`Logger: Set level to '${level}'`);
      return true;
    }
    return false;
  };
  
  // Enable/disable logging
  logger.setEnabled = function(enabled) {
    loggerConfig.enabled = !!enabled;
    console.log(`Logger: ${loggerConfig.enabled ? 'Enabled' : 'Disabled'}`);
  };
  
  // Get current logger configuration
  logger.getConfig = function() {
    return { ...loggerConfig };
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initSocket, 0);
  } else {
    document.addEventListener('DOMContentLoaded', initSocket);
  }
  
  return logger;
})();

// For backward compatibility
const logger = window.logger;

// Log that logger has been initialized
logger.info('Client logger initialized', { version: '1.0.0' });