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

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/temperatureSensors')
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Initialize Socket.io service
initSocketService(io);

// Set up routes
app.use('/api', apiRoutes(io));
app.use('/', viewRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'エラーが発生しました',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Import models
import TemperatureSensor from './models/temperatureSensor.js';
import Alert from './models/alert.js';

// API Routes
// データを受け取るエンドポイント
app.post('/api/data', async (req, res) => {
  try {
    console.log(`Received data: ${JSON.stringify(req.body)}`);
    
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
    console.error('Error saving data:', error);
    res.status(500).json({ message: 'Error saving data', error: error.message });
  }
});

// Route to get all sensor data
app.get('/api/data', async (req, res) => {
  try {
    const sensorData = await TemperatureSensor.find().sort({ created_at: -1 }).limit(100);
    res.status(200).json(sensorData);
  } catch (error) {
    console.error('Error retrieving data:', error);
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
    console.error('Error retrieving sensor data:', error);
    res.status(500).json({ message: 'Error retrieving sensor data', error: error.message });
  }
});

// Web routes
app.get('/', async (req, res) => {
  try {
    // Fetch the latest sensor readings from MongoDB (100 records as requested)
    const latestReadings = await TemperatureSensor.find()
      .sort({ created_at: -1 })
      .limit(100);

    // Format data for the view
    const formattedData = latestReadings.map(reading => ({
      sensorId: reading.sensor_id,
      date: reading.date,
      time: reading.time,
      temperature: reading.average_temp,
      temperatureData: reading.temperature_data,
      status: reading.status,
      timestamp: reading.created_at
    }));

    // Fetch the latest 10 alerts from MongoDB
    const latestAlerts = await Alert.find()
      .sort({ created_at: -1 })
      .limit(10);
      
    // Format alerts for the view
    const formattedAlerts = latestAlerts.map(alert => ({
      sensorId: alert.sensor_id,
      date: alert.date,
      time: alert.time,
      message: alert.alert_reason,
      severity: 'high',
      timestamp: alert.created_at
    }));

    // Render the view with data
    res.render('index', {
      title: '温度センサー監視システム',
      latestReadings: {
        data: formattedData,
        alerts: formattedAlerts
      }
    });
  } catch (error) {
    console.error('Error fetching data for view:', error);
    res.status(500).render('index', {
      title: '温度センサー監視システム',
      error: 'データの取得中にエラーが発生しました'
    });
  }
});

// Socket.io connection handler is now managed by socketService.js