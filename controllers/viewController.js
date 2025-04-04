/**
 * View Controller
 * Handles rendering views
 */
import TemperatureSensor from '../models/temperatureSensor.js';
import Alert from '../models/alert.js';

/**
 * Render the home page with sensor data
 */
export const renderHomePage = async (req, res) => {
  try {
    // Fetch the latest sensor readings from MongoDB (100 records as requested)
    const latestReadings = await TemperatureSensor.find()
      .sort({ created_at: -1 })
      .limit(100);
    
    // Fetch the latest 10 alerts
    const latestAlerts = await Alert.find()
      .sort({ created_at: -1 })
      .limit(10);
    
    // Render the index page with the data
    res.render('index', { 
      title: '温度センサー監視システム',
      latestReadings: {
        data: latestReadings,
        alerts: latestAlerts
      }
    });
  } catch (error) {
    console.error('Error rendering home page:', error);
    res.status(500).render('error', { 
      message: 'Failed to load home page', 
      error 
    });
  }
};

/**
 * Render the 404 page
 */
export const renderNotFound = (req, res) => {
  res.status(404).render('404', {
    title: 'ページが見つかりません',
    message: 'Page not found'
  });
};
