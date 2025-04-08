/**
 * Temperature Sensor Monitoring System
 * Main server file that initializes the application
 */

// Import required modules
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import expressLayouts from 'express-ejs-layouts';
import http from 'http';
import { Server as SocketServer } from 'socket.io';

// Import routes
import apiRoutes from './routes/apiRoutes.js';
import viewRoutes from './routes/viewRoutes.js';

// Import services
import { initSocketService } from './services/socketService.js';

import logger from './utils/logger.js';
import connectDB from './config/database.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = http.createServer(app);
const io = new SocketServer(server);
const PORT = process.env.PORT || 3000;

// Get current file directory (ESM compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Basic favicon response to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content response instead of 404 error
});

// Connect to MongoDB
connectDB();

// Initialize Socket.io service
initSocketService(io);

// Initialize the WebSocket integration for logger
logger.setupSocketIO(io);
logger.info('Logger WebSocket integration initialized');

// Set up routes
app.use('/api', apiRoutes(io));
app.use('/', viewRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).render('error', {
    title: 'エラーが発生しました',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start the server
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Import models
import TemperatureSensor from './models/temperatureSensor.js';
import Alert from './models/alert.js';

// API Routes for direct data access
// データを受け取るエンドポイント
app.post('/api/data', async (req, res) => {
  try {
    logger.info(`Received data: ${JSON.stringify(req.body)}`);
    
    // Validate that the required fields exist
    const requiredFields = ['sensor_id', 'date', 'time', 'temperature_data', 'average_temp', 'status'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        missingFields: missingFields 
      });
    }
    
    // Save data to MongoDB
    const sensorData = new TemperatureSensor(req.body);
    await sensorData.save();
    
    // Emit the new data to all connected clients via Socket.io
    io.emit('newSensorData', {
      sensor_id: sensorData.sensor_id,
      date: sensorData.date,
      time: sensorData.time,
      average_temp: sensorData.average_temp,
      temperature_data: sensorData.temperature_data,
      status: sensorData.status,
      created_at: sensorData.created_at
    });
    
    // If there's an alert, save it to the database and emit it separately
    if (sensorData.status !== '0 ：正常') {
      // Create and save alert
      const alertData = new Alert({
        sensor_id: sensorData.sensor_id,
        date: sensorData.date,
        time: sensorData.time,
        alert_reason: `温度が ${sensorData.average_temp}°C超えました`,
        status: 'alert'
      });
      
      await alertData.save();
      
      // Emit the alert to connected clients
      io.emit('newAlert', {
        sensorId: sensorData.sensor_id,
        date: alertData.date,
        time: alertData.time,
        message: alertData.alert_reason,
        severity: 'high',
        timestamp: alertData.created_at
      });
    }
    
    // 成功レスポンスを返す
    res.status(200).json({ message: 'Data received and saved successfully' });
  } catch (error) {
    logger.error('Error saving data:', error);
    res.status(500).json({ message: 'Error saving data', error: error.message });
  }
});

// Route to get all sensor data
app.get('/api/data', async (req, res) => {
  try {
    const sensorData = await TemperatureSensor.find().sort({ created_at: -1 }).limit(100);
    res.status(200).json(sensorData);
  } catch (error) {
    logger.error('Error retrieving data:', error);
    res.status(500).json({ message: 'Error retrieving data', error: error.message });
  }
});

// Route to get data for a specific sensor
app.get('/api/data/:sensorId', async (req, res) => {
  try {
    const sensorData = await TemperatureSensor.find({ sensor_id: req.params.sensorId })
      .sort({ created_at: -1 })
      .limit(100);
    res.status(200).json(sensorData);
  } catch (error) {
    logger.error('Error retrieving sensor data:', error);
    res.status(500).json({ message: 'Error retrieving sensor data', error: error.message });
  }
});

// Socket.io connection handler is now managed by socketService.js