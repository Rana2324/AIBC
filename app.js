/**
 * Temperature Sensor Monitoring System
 * Main application configuration module
 * Responsible for setting up the Express application, middleware, and routes
 */
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import expressLayouts from 'express-ejs-layouts';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import logger from './utils/logger.js';

// Import routes
import viewRoutes from './routes/viewRoutes.js';
import setupApiRoutes from './routes/apiRoutes.js';

// Import socket handler
import { initSocketService } from './services/socketService.js';

// Import middleware
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

/**
 * Configure and create the Express application
 * @returns {Object} The configured app, server and io objects
 */
function createApp() {
  // Create Express app
  const app = express();
  const server = http.createServer(app);
  const io = new SocketServer(server);

  // Get current file directory (ESM compatible)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Middleware
  app.use(express.json({
    verify: (req, res, buf, encoding) => {
      try {
        JSON.parse(buf);
      } catch (e) {
        res.status(400).json({ message: 'Invalid JSON' });
        throw new Error('Invalid JSON');
      }
    }
  }));
  app.use(express.urlencoded({ extended: true }));

  // Set up EJS view engine
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(expressLayouts);
  app.set('layout', 'layout');
  app.set('layout extractScripts', true);
  app.set('layout extractStyles', true);

  // Static files
  app.use(express.static(path.join(__dirname, 'public')));

  // Basic favicon response to prevent 404 errors
  app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // No content response instead of 404 error
  });

  // Set up Socket.io
  initSocketService(io);

  // Initialize the WebSocket integration for logger
  logger.setupSocketIO(io);

  // Routes
  app.use('/api', setupApiRoutes(io));
  app.use('/', viewRoutes);
  
  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, server, io };
}

export default createApp;
