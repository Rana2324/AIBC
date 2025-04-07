/**
 * Client-side Logger
 * A browser-compatible logger that mimics Winston's API for consistent logging
 * across both server and client parts of the application.
 */

// Define log levels with corresponding colors and priority numbers
const LOG_LEVELS = {
  error: { color: '#FF5252', priority: 0 },
  warn: { color: '#FFC107', priority: 1 },
  info: { color: '#2196F3', priority: 2 },
  http: { color: '#8BC34A', priority: 3 },
  verbose: { color: '#9C27B0', priority: 4 },
  debug: { color: '#607D8B', priority: 5 },
  silly: { color: '#795548', priority: 6 }
};

// Default log level for the client
const DEFAULT_LEVEL = 'info';

// Create the logger object
window.logger = {
  // Current log level
  level: localStorage.getItem('logLevel') || DEFAULT_LEVEL,
  
  // Set the log level
  setLevel: function(level) {
    if (LOG_LEVELS[level]) {
      this.level = level;
      localStorage.setItem('logLevel', level);
    } else {
      console.error(`Invalid log level: ${level}`);
    }
  },
  
  // Check if the message should be logged based on level priority
  shouldLog: function(level) {
    return LOG_LEVELS[level].priority <= LOG_LEVELS[this.level].priority;
  },
  
  // Format log timestamp
  formatTimestamp: function() {
    return new Date().toISOString();
  },
  
  // Generic log method
  log: function(level, message, ...args) {
    if (!this.shouldLog(level)) return;
    
    const timestamp = this.formatTimestamp();
    const logConfig = LOG_LEVELS[level];
    
    // Apply different styling based on environment
    if (typeof window !== 'undefined' && window.console) {
      // Browser environment - use console with styling
      console.log(
        `%c${timestamp} [${level.toUpperCase()}]`,
        `color: ${logConfig.color}; font-weight: bold`,
        message,
        ...args
      );
      
      // Send important logs to server (optional)
      if (level === 'error' || level === 'warn') {
        this.sendToServer(level, timestamp, message, args);
      }
    }
  },
  
  // Send logs to server for storage or monitoring
  sendToServer: function(level, timestamp, message, args) {
    // If socket.io is available, send the log to the server
    if (window.socket && typeof window.socket.emit === 'function') {
      try {
        window.socket.emit('clientLog', {
          level,
          timestamp,
          message,
          args: args.map(arg => {
            if (arg instanceof Error) {
              return { 
                name: arg.name, 
                message: arg.message, 
                stack: arg.stack 
              };
            } else if (typeof arg === 'object') {
              try {
                return JSON.stringify(arg);
              } catch (e) {
                return String(arg);
              }
            }
            return arg;
          })
        });
      } catch (e) {
        console.error('Failed to send log to server', e);
      }
    }
  },
  
  // Define methods for each log level
  error: function(message, ...args) {
    this.log('error', message, ...args);
  },
  
  warn: function(message, ...args) {
    this.log('warn', message, ...args);
  },
  
  info: function(message, ...args) {
    this.log('info', message, ...args);
  },
  
  http: function(message, ...args) {
    this.log('http', message, ...args);
  },
  
  verbose: function(message, ...args) {
    this.log('verbose', message, ...args);
  },
  
  debug: function(message, ...args) {
    this.log('debug', message, ...args);
  },
  
  silly: function(message, ...args) {
    this.log('silly', message, ...args);
  }
};

// For backward compatibility
const logger = window.logger;