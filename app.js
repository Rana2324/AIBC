/**
 * Temperature Sensor Monitoring System
 * Main application configuration module.
 * Sets up the Express application, middleware, routes, and WebSocket server.
 */

import express from 'express';
import http from 'http';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import expressLayouts from 'express-ejs-layouts';
import { Server as SocketServer } from 'socket.io';

// Utilities
import logger from './utils/logger.js';
import setupMorgan from './utils/morgan.js';

// Routes
import viewRoutes from './routes/viewRoutes.js';
import setupApiRoutes from './routes/apiRoutes.js';

// Socket Service
import { initSocketService } from './services/socketService.js';

// Middleware
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

/**
 * Initializes and configures the Express application.
 * @returns {Object} The configured app, server, and Socket.io instance.
 */
function createApp() {
  // Initialize Express app and HTTP server
  const app = express();
  const server = http.createServer(app);
  const io = new SocketServer(server);

  // Get __dirname in ES module scope
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // JSON and URL-encoded middleware with custom JSON error handling
  app.use(express.json({
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf);
        
        // Store sensor_id in request for Morgan logger if this is a sensor data request
        if (req.method === 'POST' && req.url === '/api/data') {
          const body = JSON.parse(buf.toString());
          if (body && body.sensor_id) {
            req.sensorId = body.sensor_id;
          }
        }
      } catch {
        res.status(400).json({ message: 'Invalid JSON' });
        throw new Error('Invalid JSON');
      }
    }
  }));
  app.use(express.urlencoded({ extended: true }));
  
  // Set up HTTP request logging AFTER body parsers
  setupMorgan({ environment: process.env.NODE_ENV }).setup(app);

  // Static file serving
  app.use(express.static(path.join(__dirname, 'public')));

  // Handle favicon requests to prevent 404
  app.get('/favicon.ico', (req, res) => res.status(204).end());

  // Set EJS as view engine with layout support
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(expressLayouts);
  app.set('layout', 'layout');
  app.set('layout extractScripts', true);
  app.set('layout extractStyles', true);

  // Setup WebSocket and real-time logging
  initSocketService(io);
  logger.setupSocketIO(io);

  // Register application routes
  app.use('/api', setupApiRoutes(io));
  app.use('/', viewRoutes);

  // Error handling middleware
  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, server, io };
}

export default createApp;
