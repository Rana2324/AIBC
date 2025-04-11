/**
 * Temperature Sensor Monitoring System
 * Entry point of the application
 */

import createApp from './app.js';
import logger from './utils/logger.js';
import connectDB from './config/database.js';

// Set default port
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('Connected to database');

    // Create Express application and server
    const { server, app } = createApp();

    // Start server
    server.listen(PORT, () => {
      logger.info(`Server is running on http://localhost:${PORT}`);
    });

    // Graceful shutdown handler
   // Graceful shutdown handler
   const gracefulShutdown = async (signal) => {
    logger.info(`${signal} signal received. Shutting down gracefully...`);
    try {
      // Close HTTP server
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) return reject(err);
          logger.info('HTTP server closed');
          resolve();
        });
      });

      // Close MongoDB connection
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');

      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

    // Handle termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));// Ctrl+C
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));// kill বা Docker stop

    // Handle unexpected errors
    process.on('unhandledRejection', (err) => {
      logger.error('Unhandled Rejection:', err);
      process.exit(1);
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
