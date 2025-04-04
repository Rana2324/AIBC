/**
 * Database Configuration
 * Handles connection to MongoDB
 */
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

// Set default MongoDB connection options
const options = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

/**
 * Get MongoDB connection status
 * @returns {boolean} Connection status
 */
const getConnectionStatus = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Connect to MongoDB
 * @returns {Promise} Mongoose connection
 */
const connectDB = async () => {
  try {
    // Get MongoDB URI from environment variable or use default
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/temperatureSensors';

    // Connect to MongoDB
    const conn = await mongoose.connect(uri, options);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    return true;
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    return false;
  }
};

export { connectDB, mongoose, getConnectionStatus };