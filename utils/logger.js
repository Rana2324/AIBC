/**
 * Logger Utility
 * Provides centralized logging with different severity levels
 * using Winston logger
 */
import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

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

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'sensor-api' },
  transports: [
    // Write all logs to console
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(
          ({ timestamp, level, message, service, ...meta }) =>
            `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
            }`
        )
      ),
    }),
    // Write all logs with level 'error' and below to error.log
    new transports.File({ filename: join(logDir, 'error.log'), level: 'error' }),
    // Write all logs with level 'info' and below to combined.log
    new transports.File({ filename: join(logDir, 'combined.log') }),
  ],
});

// Create a stream object for Morgan middleware
logger.stream = {
  write: (message) => logger.info(message.trim()),
};

export default logger;