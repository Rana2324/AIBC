/**
 * Client-side logger for the temperature sensor monitoring system
 * Features:
 * - Multiple log levels (debug, info, warn, error)
 * - Console output with formatting
 * - Socket.IO integration for sending logs to server
 * - Configurable verbosity
 */

const Logger = (function() {
  // Configuration
  let config = {
    enabled: true,
    minLevel: 'info',      // Minimum level to log: debug, info, warn, error
    consoleOutput: true,   // Output to browser console
    serverSync: true,      // Send logs to server via socket.io
    includeTimestamp: true // Include timestamp in logs
  };
  
  // Log levels and their priorities
  const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  // Convert minLevel to priority number
  let minLevelPriority = LOG_LEVELS[config.minLevel] || 1;
  
  // Format current time for logs
  const getTimestamp = function() {
    const now = new Date();
    return now.toISOString();
  };

  // Send log to server via Socket.IO if available
  const sendToServer = function(level, message, meta) {
    if (!config.serverSync) return;
    
    // Get the socket instance if it exists
    const socket = window.socket;
    if (!socket) return;
    
    // Only send if socket is connected
    if (socket.connected) {
      socket.emit('client-log', {
        level,
        message,
        meta: meta || {},
        timestamp: getTimestamp(),
        userAgent: navigator.userAgent
      });
    }
  };
  
  // Log to console with formatting
  const logToConsole = function(level, message, meta) {
    if (!config.consoleOutput) return;
    
    const timestamp = config.includeTimestamp ? `[${getTimestamp()}]` : '';
    const prefix = `${timestamp} [${level.toUpperCase()}]`;
    
    // Different console methods based on level
    switch (level) {
      case 'debug':
        console.debug(`${prefix}:`, message, meta || '');
        break;
      case 'info':
        console.info(`${prefix}:`, message, meta || '');
        break;
      case 'warn':
        console.warn(`${prefix}:`, message, meta || '');
        break;
      case 'error':
        console.error(`${prefix}:`, message, meta || '');
        break;
      default:
        console.log(`${prefix}:`, message, meta || '');
    }
  };
  
  // Generic log method
  const log = function(level, message, meta) {
    if (!config.enabled) return;
    
    // Check if level meets minimum level requirement
    const levelPriority = LOG_LEVELS[level] || 0;
    if (levelPriority < minLevelPriority) return;
    
    // Log to console
    logToConsole(level, message, meta);
    
    // Send to server
    sendToServer(level, message, meta);
    
    return this; // For chaining
  };
  
  // Public API
  return {
    // Log methods
    debug: function(message, meta) {
      return log('debug', message, meta);
    },
    info: function(message, meta) {
      return log('info', message, meta);
    },
    warn: function(message, meta) {
      return log('warn', message, meta);
    },
    error: function(message, meta) {
      return log('error', message, meta);
    },
    
    // Configuration methods
    configure: function(options) {
      if (!options) return config;
      
      config = {
        ...config,
        ...options
      };
      
      // Update minLevelPriority based on new config
      minLevelPriority = LOG_LEVELS[config.minLevel] || 1;
      
      return this; // For chaining
    },
    getConfig: function() {
      return { ...config };
    },
    
    // Enable/disable logging
    enable: function() {
      config.enabled = true;
      return this;
    },
    disable: function() {
      config.enabled = false;
      return this;
    }
  };
})();

// Set global logger variable for use throughout the application
window.logger = Logger;

// No export statement - just make it globally available