/**
 * Temperature Sensor Monitoring System - Server
 * Main server file that initializes the application
 */
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import morgan from 'morgan';
import expressLayouts from 'express-ejs-layouts';
import session from 'express-session';
import { connectDB } from './config/db.js';
import logger from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import dataService from './services/dataService.js';
import apiRoutes from './routes/api.js';
import viewRoutes from './routes/viewApi.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const server = createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev', { stream: logger.stream }));
app.use(express.static(join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'temperature-sensor-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// View engine setup
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));
app.set('layout', 'layouts/main');

// Routes
app.use('/api', apiRoutes);
app.use('/', viewRoutes);

// Connect to MongoDB
connectDB()
  .then(connected => {
    if (!connected) {
      logger.warn('Starting server without database connection');
    }

    // Start server
    const PORT = process.env.PORT || 3000;

    // Make io accessible to routes
    app.set('io', io);

    // Socket.IO connection handler
    io.on('connection', (socket) => {
      logger.info('New client connected');

      // Send initial data to the client
      dataService.getLatestData()
        .then(data => socket.emit('initialData', data))
        .catch(error => logger.error('Error sending initial data:', error));

      socket.on('disconnect', () => {
        logger.info('Client disconnected');
      });
    });

    // Start periodic data fetching
    const fetchInterval = 5000; // 5 seconds
    setInterval(async () => {
      try {
        const newData = await dataService.fetchAndStoreData();
        io.emit('dataUpdate', newData);
      } catch (error) {
        logger.error('Error in periodic data fetch:', error);
      }
    }, fetchInterval);

    server.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  })
  .catch(err => {
    logger.error('Failed to initialize database connection', err);
    process.exit(1);
  });

// Error handlers must be after all other middleware and routes
app.use(notFoundHandler);
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});