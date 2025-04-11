/**
 * Client-side logger for the temperature sensor monitoring system
 * Features:
 * - Multiple log levels (debug, info, warn, error)
 * - Console output with formatting
 * - Socket.IO integration for sending logs to server
 * - Configurable verbosity
 * - Integration with server-side Winston logger
 */

const Logger = (function() {
  // Configuration
  let config = {
    enabled: true,
    minLevel: 'info',      // Minimum level to log: debug, info, warn, error
    consoleOutput: true,   // Output to browser console
    serverSync: true,      // Send logs to server via socket.io
    includeTimestamp: true, // Include timestamp in logs
    batchLogs: false,      // Batch logs before sending to server
    batchInterval: 5000,   // Batch interval in ms
    includeContext: true,  // Include context info like URL, user agent, etc.
    maxLogSize: 50         // Maximum number of logs to keep in memory
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
  
  // Store logs in memory for batching
  let pendingLogs = [];
  let batchTimeout = null;

  // Get user and session information for logging context
  const getContextInfo = function() {
    if (!config.includeContext) return {};

    // Basic context information
    const context = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: new Date().toISOString()
    };
    
    // Add session info if available
    try {
      const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
      if (userId) context.userId = userId;
      
      const sessionId = sessionStorage.getItem('sessionId');
      if (sessionId) context.sessionId = sessionId;
    } catch (e) {
      // Ignore storage access errors in case of private browsing mode
    }
    
    return context;
  };
  
  // Format current time for logs
  const getTimestamp = function() {
    const now = new Date();
    return now.toISOString();
  };

  // Format log message with styling for better readability
  const formatConsoleMessage = function(level, message) {
    // Define styles for different log levels
    const styles = {
      debug: 'color: #6c757d', // gray
      info: 'color: #0d6efd',  // blue
      warn: 'color: #fd7e14',  // orange
      error: 'color: #dc3545; font-weight: bold' // red, bold
    };
    
    const timestamp = config.includeTimestamp ? `%c[${getTimestamp()}]` : '';
    const prefix = `${timestamp} %c[${level.toUpperCase()}]:`;
    const style1 = 'color: #495057'; // timestamp style
    const style2 = styles[level] || ''; // level style
    
    return {
      formatString: `${prefix} %c${message}`,
      styles: [style1, style2, 'color: inherit']
    };
  };

  // Send log to server via Socket.IO if available
  const sendToServer = function(level, message, meta) {
    if (!config.serverSync) return;
    
    // Create log object
    const logEntry = {
      level,
      message,
      meta: meta || {},
      context: getContextInfo(),
      timestamp: getTimestamp()
    };

    // If batching is enabled, add to pending logs
    if (config.batchLogs) {
      pendingLogs.push(logEntry);
      
      // If no timeout is set, create one to send logs
      if (!batchTimeout) {
        batchTimeout = setTimeout(sendBatchedLogs, config.batchInterval);
      }
      
      // If we have reached the maximum batch size, send immediately
      if (pendingLogs.length >= config.maxLogSize) {
        sendBatchedLogs();
      }
    } else {
      // Send immediately if not batching
      sendLogToServer(logEntry);
    }
  };

  // Send batched logs to server
  const sendBatchedLogs = function() {
    if (pendingLogs.length === 0) return;
    
    // Get the socket instance if it exists
    const socket = window.socket;
    if (!socket || !socket.connected) {
      // Store logs in session storage if socket is not available
      try {
        const storedLogs = JSON.parse(sessionStorage.getItem('pendingLogs') || '[]');
        sessionStorage.setItem('pendingLogs', JSON.stringify([...storedLogs, ...pendingLogs]));
      } catch (e) {
        // Ignore storage errors
      }
      pendingLogs = [];
      batchTimeout = null;
      return;
    }
    
    // Send logs as a batch
    socket.emit('client-logs-batch', pendingLogs);
    
    // Clear pending logs and timeout
    pendingLogs = [];
    batchTimeout = null;
  };

  // Send single log to server
  const sendLogToServer = function(logEntry) {
    // Get the socket instance if it exists
    const socket = window.socket;
    if (!socket || !socket.connected) {
      // Store log in session storage if socket is not available
      try {
        const storedLogs = JSON.parse(sessionStorage.getItem('pendingLogs') || '[]');
        storedLogs.push(logEntry);
        sessionStorage.setItem('pendingLogs', JSON.stringify(storedLogs));
      } catch (e) {
        // Ignore storage errors
      }
      return;
    }
    
    // Send log to server
    socket.emit('client-log', logEntry);
  };
  
  // Check for unsent logs and send them
  const checkForUnsentLogs = function() {
    try {
      const storedLogs = JSON.parse(sessionStorage.getItem('pendingLogs') || '[]');
      if (storedLogs.length > 0) {
        // Get the socket instance if it exists
        const socket = window.socket;
        if (socket && socket.connected) {
          socket.emit('client-logs-batch', storedLogs);
          sessionStorage.removeItem('pendingLogs');
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
  };

  // Set up socket reconnect handler to send pending logs
  const setupSocketHandlers = function() {
    if (typeof window !== 'undefined' && window.socket) {
      window.socket.on('connect', function() {
        if (pendingLogs.length > 0) {
          sendBatchedLogs();
        }
        checkForUnsentLogs();
      });
    }
  };
  
  // Try to set up socket handlers
  if (typeof window !== 'undefined') {
    // If socket.io is already loaded
    if (window.socket) {
      setupSocketHandlers();
    }
    // Otherwise wait for the socket to be initialized
    else {
      window.addEventListener('load', function() {
        if (window.socket) {
          setupSocketHandlers();
        }
      });
    }
  }
  
  // Log to console with formatting
  const logToConsole = function(level, message, meta) {
    if (!config.consoleOutput) return;
    
    const { formatString, styles } = formatConsoleMessage(level, message);
    
    // Different console methods based on level
    switch (level) {
      case 'debug':
        console.debug(formatString, ...styles, meta || '');
        break;
      case 'info':
        console.info(formatString, ...styles, meta || '');
        break;
      case 'warn':
        console.warn(formatString, ...styles, meta || '');
        break;
      case 'error':
        console.error(formatString, ...styles, meta || '');
        break;
      default:
        console.log(formatString, ...styles, meta || '');
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
    },
    
    // Force send any pending logs
    flush: function() {
      if (pendingLogs.length > 0) {
        sendBatchedLogs();
      }
      checkForUnsentLogs();
      return this;
    },
    
    // Listen for server logs (if server sends logs to client)
    listenForServerLogs: function() {
      if (typeof window !== 'undefined' && window.socket) {
        window.socket.on('server-log', function(logData) {
          const { level, message, meta } = logData;
          // Don't send these back to server to avoid loops
          logToConsole(level || 'info', `[SERVER] ${message}`, meta);
        });
      }
      return this;
    }
  };
})();

// Set global logger variable for use throughout the application
window.logger = Logger;

// Initialize logger with any user preferences
(function() {
  try {
    // Check local storage for saved config
    const savedConfig = localStorage.getItem('loggerConfig');
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      Logger.configure(parsedConfig);
    }
    
    // Setup server log listener if in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      Logger.listenForServerLogs();
    }
    
    // Log initialization
    Logger.info('Client logger initialized', { 
      config: Logger.getConfig(),
      url: window.location.href
    });
  } catch (e) {
    // Ignore storage errors
    console.error('Error initializing logger:', e);
  }
})();

// No export statement - just make it globally available