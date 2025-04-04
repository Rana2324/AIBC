/**
 * Client-side Logger Utility
 * Provides consistent logging functions with timestamps and different log levels
 */

class Logger {
  constructor(options = {}) {
    this.debugEnabled = options.debugEnabled || (localStorage.getItem('debug') === 'true');
    this.logLevel = options.logLevel || localStorage.getItem('logLevel') || 'info';
    this.useColors = options.useColors !== undefined ? options.useColors : true;
    
    // Log levels and their priorities
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    // Colors for different log levels
    this.colors = {
      error: 'color: #FF5252; font-weight: bold',
      warn: 'color: #FFC107; font-weight: bold',
      info: 'color: #2196F3',
      debug: 'color: #9E9E9E',
      time: 'color: #4CAF50'
    };
  }
  
  /**
   * Get formatted timestamp
   * @returns {string} - Current time formatted as HH:MM:SS.mmm
   */
  timestamp() {
    const now = new Date();
    return now.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  }
  
  /**
   * Format log message with timestamp
   * @param {string} level - Log level (error, warn, info, debug)
   * @param {Array} args - Arguments to log
   * @returns {Array} - Formatted arguments array for console logging
   */
  format(level, args) {
    const timestamp = this.timestamp();
    
    if (this.useColors) {
      return [
        `%c[${timestamp}]%c [${level.toUpperCase()}]:`,
        this.colors.time,
        this.colors[level],
        ...args
      ];
    } else {
      return [
        `[${timestamp}] [${level.toUpperCase()}]:`,
        ...args
      ];
    }
  }
  
  /**
   * Check if the given level should be logged
   * @param {string} level - Log level to check
   * @returns {boolean} - Whether the level should be logged
   */
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }
  
  /**
   * Log error message
   * @param {...any} args - Arguments to log
   */
  error(...args) {
    if (this.shouldLog('error')) {
      console.error(...this.format('error', args));
    }
  }
  
  /**
   * Log warning message
   * @param {...any} args - Arguments to log
   */
  warn(...args) {
    if (this.shouldLog('warn')) {
      console.warn(...this.format('warn', args));
    }
  }
  
  /**
   * Log info message
   * @param {...any} args - Arguments to log
   */
  info(...args) {
    if (this.shouldLog('info')) {
      console.info(...this.format('info', args));
    }
  }
  
  /**
   * Log debug message
   * @param {...any} args - Arguments to log
   */
  debug(...args) {
    if (this.debugEnabled && this.shouldLog('debug')) {
      console.debug(...this.format('debug', args));
    }
  }
  
  /**
   * Log table with title
   * @param {string} title - Table title
   * @param {object|array} data - Table data
   */
  table(title, data) {
    if (this.shouldLog('info')) {
      console.info(...this.format('info', [title]));
      console.table(data);
    }
  }
  
  /**
   * Start timing for performance measurement
   * @param {string} label - Timer label
   */
  time(label) {
    console.time(label);
  }
  
  /**
   * End timing and log elapsed time
   * @param {string} label - Timer label
   */
  timeEnd(label) {
    console.timeEnd(label);
  }
  
  /**
   * Set debug mode
   * @param {boolean} enabled - Whether debug mode is enabled
   */
  setDebugMode(enabled) {
    this.debugEnabled = enabled;
    localStorage.setItem('debug', enabled);
  }
  
  /**
   * Set log level
   * @param {string} level - Log level (error, warn, info, debug)
   */
  setLogLevel(level) {
    if (this.levels[level] !== undefined) {
      this.logLevel = level;
      localStorage.setItem('logLevel', level);
    }
  }
}

// Create global logger instance
const logger = new Logger({
  debugEnabled: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
  logLevel: 'info',
  useColors: true
});

// Export for use in other modules
window.logger = logger;