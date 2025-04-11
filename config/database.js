/**
 * Database configuration
 * Handles MongoDB connection setup
 */

import mongoose from 'mongoose';
import logger from '../utils/logger.js';

/**
 * Initializes the MongoDB connection
 * @returns {Promise} Mongoose connection promise
 */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/temperatureSensors');
    logger.info('MongoDB connected successfully');
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  }
};


export default connectDB;