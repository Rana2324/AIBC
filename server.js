/**
 * Temperature Sensor Data Server
 * Receives sensor data and stores it in MongoDB
 */
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';
import expressLayouts from 'express-ejs-layouts';
import { Server as SocketServer } from 'socket.io';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

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

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Temperature Sensor Schema
const temperatureSensorSchema = new mongoose.Schema({
  sensor_id: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  temperature_data: {
    type: [Number],
    required: true
  },
  average_temp: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Create Temperature Sensor Model
const TemperatureSensor = mongoose.model('TemperatureSensor', temperatureSensorSchema);

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
    
    // If there's an alert, emit it separately
    if (sensorData.status !== '0 ：正常') {
      io.emit('newAlert', {
        sensorId: sensorData.sensor_id,
        message: `異常な温度読み取り: ${sensorData.average_temp}°C`,
        severity: 'high',
        timestamp: sensorData.created_at
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
    // Fetch the latest sensor readings from MongoDB
    const latestReadings = await TemperatureSensor.find()
      .sort({ created_at: -1 })
      .limit(20);

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

    // Check for any alerts (status not normal)
    const alerts = latestReadings
      .filter(reading => reading.status !== '0 ：正常')
      .map(reading => ({
        sensorId: reading.sensor_id,
        message: `Abnormal temperature reading: ${reading.average_temp}°C`,
        severity: 'high',
        timestamp: reading.created_at
      }));

    // Render the view with data
    res.render('index', {
      title: '温度センサー監視システム',
      latestReadings: {
        data: formattedData,
        alerts: alerts
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

// Start server with Socket.io
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Set up Socket.io for real-time updates
const io = new SocketServer(server);

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('A client connected');
  
  // Send initial data to the client
  sendInitialData(socket);
  
  socket.on('disconnect', () => {
    console.log('A client disconnected');
  });
});

// Function to send initial data to a connected client
async function sendInitialData(socket) {
  try {
    const latestReadings = await TemperatureSensor.find()
      .sort({ created_at: -1 })
      .limit(10);
      
    const formattedData = latestReadings.map(reading => ({
      sensorId: reading.sensor_id,
      date: reading.date,
      time: reading.time,
      temperature: reading.average_temp,
      temperatureData: reading.temperature_data,
      status: reading.status,
      timestamp: reading.created_at
    }));
    
    const alerts = latestReadings
      .filter(reading => reading.status !== '0 ：正常')
      .map(reading => ({
        sensorId: reading.sensor_id,
        message: `Abnormal temperature reading: ${reading.average_temp}°C`,
        severity: 'high',
        timestamp: reading.created_at
      }));
      
    socket.emit('initialData', {
      data: formattedData,
      alerts: alerts
    });
    
    // Set up event to emit data updates when new data is received
    socket.on('requestUpdate', async () => {
      try {
        const updatedReadings = await TemperatureSensor.find()
          .sort({ created_at: -1 })
          .limit(10);
          
        const updatedData = updatedReadings.map(reading => ({
          sensorId: reading.sensor_id,
          date: reading.date,
          time: reading.time,
          temperature: reading.average_temp,
          temperatureData: reading.temperature_data,
          status: reading.status,
          timestamp: reading.created_at
        }));
        
        const updatedAlerts = updatedReadings
          .filter(reading => reading.status !== '0 ：正常')
          .map(reading => ({
            sensorId: reading.sensor_id,
            message: `Abnormal temperature reading: ${reading.average_temp}°C`,
            severity: 'high',
            timestamp: reading.created_at
          }));
          
        socket.emit('dataUpdate', {
          data: updatedData,
          alerts: updatedAlerts
        });
      } catch (error) {
        console.error('Error sending data update:', error);
      }
    });
  } catch (error) {
    console.error('Error sending initial data:', error);
  }
}