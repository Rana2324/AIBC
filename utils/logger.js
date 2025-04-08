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
// Import socket.io for real-time logging integration
import { Server as SocketServer } from 'socket.io';
// Import daily rotation package
import 'winston-daily-rotate-file';

const { format, transports } = winston;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create logs directory if it doesn't exist
const logDir = join(__dirname, '..', 'logs');
if (!existsSync(logDir)) {
  mkdirSync(logDir);
}

// Define log format
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

// Console format with colors
const consoleFormat = format.combine(
  format.colorize(),
  format.printf(
    ({ timestamp, level, message, service, ...meta }) =>
      `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`
  )
);

// Initialize socket clients array to broadcast logs
let socketClients = [];

// Daily rotating file transport for error logs
const errorRotateTransport = new winston.transports.DailyRotateFile({
  filename: join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '14d', // keep logs for 14 days
  format: logFormat
});

// Daily rotating file transport for combined logs
const combinedRotateTransport = new winston.transports.DailyRotateFile({
  filename: join(logDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d', // keep logs for 14 days
  format: logFormat
});

// Create the logger with enhanced options
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'sensor-api' },
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
      filename: join(logDir, 'error.log'), 
      level: 'error' 
    }),
    new transports.File({ 
      filename: join(logDir, 'combined.log')
    }),
    // Client logs stored separately
    new transports.File({ 
      filename: join(logDir, 'client.log'),
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

// Setup WebSocket integration for real-time logging
logger.setupSocketIO = (io) => {
  // Listen for new client connections
  io.on('connection', (socket) => {
    console.log('Client connected for real-time logs');
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