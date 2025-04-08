/**
 * Temperature Sensor Monitoring System
 * Main server file that initializes the application
 */

// Import application factory
import createApp from './app.js';
import logger from './utils/logger.js';
import connectDB from './config/database.js';

// Set default PORT
const PORT = process.env.PORT || 3000;

// Create application from factory
const { server, app } = createApp();

// Connect to MongoDB
connectDB();

// Start the server
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});