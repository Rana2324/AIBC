/**
 * View routes for the temperature sensor monitoring system
 */
import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// Get Temperature Sensor model
const TemperatureSensor = mongoose.model('TemperatureSensor');

// Home page - display temperature data
router.get('/', async (req, res) => {
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

// Dashboard page
router.get('/dashboard', async (req, res) => {
  try {
    // Get sensor statistics
    const totalReadings = await TemperatureSensor.countDocuments();
    const latestReading = await TemperatureSensor.findOne().sort({ created_at: -1 });
    
    // Get unique sensor IDs
    const uniqueSensors = await TemperatureSensor.distinct('sensor_id');
    
    // Get abnormal readings count
    const abnormalReadings = await TemperatureSensor.countDocuments({
      status: { $ne: '0 ：正常' }
    });
    
    res.render('dashboard', {
      title: 'ダッシュボード',
      stats: {
        totalReadings,
        latestReading: latestReading ? {
          sensorId: latestReading.sensor_id,
          temperature: latestReading.average_temp,
          timestamp: latestReading.created_at
        } : null,
        uniqueSensors: uniqueSensors.length,
        abnormalReadings
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).render('dashboard', {
      title: 'ダッシュボード',
      error: 'データの取得中にエラーが発生しました'
    });
  }
});

// API endpoint to get sensor data for charts
router.get('/api/chart-data', async (req, res) => {
  try {
    const { sensorId, limit = 50 } = req.query;
    
    // Build query
    const query = {};
    if (sensorId) {
      query.sensor_id = sensorId;
    }
    
    // Get data
    const readings = await TemperatureSensor.find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .lean();
    
    // Format data for charts
    const chartData = readings.map(reading => ({
      sensorId: reading.sensor_id,
      temperature: reading.average_temp,
      timestamp: reading.created_at,
      temperatureData: reading.temperature_data
    }));
    
    res.json(chartData);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ error: 'Error fetching chart data' });
  }
});

export default router;
