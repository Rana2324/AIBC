/**
 * Logger Utility
 * Provides centralized logging with different severity levels
 * using Winston logger with enhanced features:
 * - Custom Transports (files, console, HTTP)
 * - Real-time Integrations via WebSocket
 * - Multiple formats (JSON, plain text)
 * - Optimized performance with async logging
 * - Daily log rotation
 */
import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';
// Import daily rotation package
import 'winston-daily-rotate-file';

const { format, transports } = winston;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration constants
const LOG_CONFIG = {
  directory: join(__dirname, '..', 'logs'),
  retention: '14d', // keep logs for 14 days
  maxSize: '20m',
  datePattern: 'YYYY-MM-DD',
  timeFormat: 'YYYY-MM-DD HH:mm:ss',
  defaultLevel: process.env.LOG_LEVEL || 'info',
  serviceName: 'sensor-api',
  zippedArchive: true
};

// Create logs directory if it doesn't exist
if (!existsSync(LOG_CONFIG.directory)) {
  mkdirSync(LOG_CONFIG.directory);
}

// Define log format for file output (JSON for machine processing)
const logFormat = format.combine(
  format.timestamp({ format: LOG_CONFIG.timeFormat }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

// Improved console format with better readability and key-value formatting
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: LOG_CONFIG.timeFormat }),
  format.printf(({ timestamp, level, message, service, ...meta }) => {
    // Format metadata as key=value pairs for better readability and filtering
    const metaStr = Object.entries(meta)
      .filter(([_, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(' | ');
      
    // Create the final log format: [timestamp] [LEVEL] message | key1=value1 | key2=value2
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr ? ' | ' + metaStr : ''}`;
  })
);

// Initialize socket clients array to broadcast logs
let socketClients = [];

// Daily rotating file transport for error logs
const errorRotateTransport = new winston.transports.DailyRotateFile({
  filename: join(LOG_CONFIG.directory, 'error-%DATE%.log'),
  datePattern: LOG_CONFIG.datePattern,
  level: 'error',
  maxSize: LOG_CONFIG.maxSize,
  maxFiles: LOG_CONFIG.retention,
  format: logFormat,
  zippedArchive: LOG_CONFIG.zippedArchive
});

// Daily rotating file transport for combined logs
const combinedRotateTransport = new winston.transports.DailyRotateFile({
  filename: join(LOG_CONFIG.directory, 'combined-%DATE%.log'),
  datePattern: LOG_CONFIG.datePattern,
  maxSize: LOG_CONFIG.maxSize,
  maxFiles: LOG_CONFIG.retention,
  format: logFormat,
  zippedArchive: LOG_CONFIG.zippedArchive
});

// Create the logger with enhanced options
const logger = winston.createLogger({
  level: LOG_CONFIG.defaultLevel,
  format: logFormat,
  defaultMeta: { service: LOG_CONFIG.serviceName },
  transports: [
    // Write all logs to console with colors
    new transports.Console({
      format: consoleFormat
    }),
    // Error logs with rotation
    errorRotateTransport,
    // Combined logs with rotation
    combinedRotateTransport,
    // Keep original file transports for backward compatibility
    new transports.File({ 
      filename: join(LOG_CONFIG.directory, 'error.log'), 
      level: 'error' 
    }),
    new transports.File({ 
      filename: join(LOG_CONFIG.directory, 'combined.log')
    }),
    // Client logs stored separately
    new transports.File({ 
      filename: join(LOG_CONFIG.directory, 'client.log'),
      level: 'info'
    })
  ],
  // Enable async logging for better performance
  exitOnError: false
});

// Add HTTP transport if needed
if (process.env.LOG_HTTP_ENDPOINT) {
  logger.add(new winston.transports.Http({
    host: process.env.LOG_HTTP_HOST || 'localhost',
    port: process.env.LOG_HTTP_PORT || 3001,
    path: process.env.LOG_HTTP_PATH || '/logs',
    ssl: process.env.LOG_HTTP_SSL === 'true'
  }));
}

// Create a stream object for Morgan middleware
logger.stream = {
  write: (message) => logger.info(message.trim()),
};

/**
 * Sets up WebSocket integration for real-time logging
 * @param {SocketIO.Server} io - Socket.io server instance
 */
logger.setupSocketIO = (io) => {
  // Listen for new client connections
  io.on('connection', (socket) => {
    // console.log('Client connected for real-time logs');
    socketClients.push(socket);

    // Remove socket on disconnect
    socket.on('disconnect', () => {
      socketClients = socketClients.filter(client => client.id !== socket.id);
    });
    
    // Handle client log events
    socket.on('client-log', (logData) => {
      // Store client logs in the server
      logger.log({
        level: logData.level || 'info',
        message: logData.message,
        source: 'client',
        clientId: socket.id,
        ...logData.meta
      });
    });
  });
  
  // Create a custom format that broadcasts logs to WebSocket clients
  const socketTransportFormat = winston.format((info) => {
    // Only broadcast server logs, not client logs to avoid loops
    if (info.source !== 'client' && socketClients.length > 0) {
      socketClients.forEach(socket => {
        socket.emit('server-log', info);
      });
    }
    return info;
  })();
  
  // Add a custom transport with the socket format
  // Use Console transport as a base since it doesn't require a stream
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      socketTransportFormat,
      winston.format.printf(() => '') // Don't output anything to console
    ),
    silent: true // This prevents double logging to console
  }));
};

export default logger;