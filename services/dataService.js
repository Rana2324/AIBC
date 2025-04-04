/**
 * Data Service
 * Handles data fetching and processing for sensor data
 */
import SensorData from '../models/SensorData.js';
import Alert from '../models/Alert.js';
import logger from '../utils/logger.js';

/**
 * Get latest sensor data and alerts
 */
async function getLatestData() {
    try {
        const [sensorData, alerts] = await Promise.all([
            SensorData.find()
                .sort({ timestamp: -1 })
                .limit(100),
            Alert.find({ resolved: false })
                .sort({ timestamp: -1 })
                .limit(50)
        ]);

        return {
            sensorData,
            alerts
        };
    } catch (error) {
        logger.error('Error getting latest data:', error);
        throw error;
    }
}

/**
 * Fetch new data from sensors and store in database
 * This is a mock implementation - replace with actual sensor data fetching
 */
async function fetchAndStoreData() {
    try {
        // Mock sensor data - replace with actual sensor reading logic
        const mockData = {
            sensorId: `SENSOR_${Math.floor(Math.random() * 5) + 1}`,
            temperature: 20 + Math.random() * 15, // Random temperature between 20-35°C
            humidity: 30 + Math.random() * 50, // Random humidity between 30-80%
            location: ['Room A', 'Room B', 'Room C'][Math.floor(Math.random() * 3)],
            batteryLevel: 60 + Math.random() * 40, // Random battery level between 60-100%
        };

        const sensorData = new SensorData(mockData);
        await sensorData.save();

        return sensorData;
    } catch (error) {
        logger.error('Error fetching and storing data:', error);
        throw error;
    }
}

export default {
    getLatestData,
    fetchAndStoreData
};