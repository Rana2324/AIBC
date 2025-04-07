/**
 * Client-side Logger Stub
 * This is a stub implementation that does nothing, as we've removed client-side logging
 * to use server-side logging exclusively.
 */

// Create a no-operation logger
window.logger = {
  // Stub functions for each log level
  error: function() {},
  warn: function() {},
  info: function() {},
  http: function() {},
  verbose: function() {},
  debug: function() {},
  silly: function() {},
  
  // Stub for setLevel
  setLevel: function() {}
};

// For backward compatibility
const logger = window.logger;