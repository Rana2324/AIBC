import SensorData from '../models/SensorData.js';
import Alert from '../models/Alert.js';
import logger from '../utils/logger.js';

class SensorService {
    constructor() {
        this.temperatureThresholds = {
            high: 30,
            low: 10
        };
        this.humidityThresholds = {
            high: 80,
            low: 20
        };
        this.batteryThreshold = 20;
    }

    async createSensorReading(data) {
        try {
            const sensorData = new SensorData(data);
            await sensorData.save();
            await this.checkAlerts(sensorData);
            return sensorData;
        } catch (error) {
            logger.error('Error creating sensor reading:', error);
            throw error;
        }
    }

    async getLatestReadings(limit = 10) {
        try {
            return await SensorData.find()
                .sort({ timestamp: -1 })
                .limit(limit);
        } catch (error) {
            logger.error('Error getting latest readings:', error);
            throw error;
        }
    }

    async getReadingsByLocation(location, startDate, endDate) {
        try {
            const query = { location };
            if (startDate && endDate) {
                query.timestamp = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }
            return await SensorData.find(query).sort({ timestamp: -1 });
        } catch (error) {
            logger.error('Error getting readings by location:', error);
            throw error;
        }
    }

    async getReadingsBySensorId(sensorId, startDate, endDate) {
        try {
            const query = { sensorId };
            if (startDate && endDate) {
                query.timestamp = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }
            return await SensorData.find(query).sort({ timestamp: -1 });
        } catch (error) {
            logger.error('Error getting readings by sensor ID:', error);
            throw error;
        }
    }

    async checkAlerts(sensorData) {
        try {
            const alerts = [];

            // Check temperature
            if (sensorData.temperature > this.temperatureThresholds.high) {
                alerts.push({
                    sensorId: sensorData.sensorId,
                    type: 'HIGH_TEMP',
                    message: `High temperature detected: ${sensorData.temperature}°C`,
                    severity: 'WARNING',
                    value: sensorData.temperature,
                    threshold: this.temperatureThresholds.high,
                    location: sensorData.location
                });
            } else if (sensorData.temperature < this.temperatureThresholds.low) {
                alerts.push({
                    sensorId: sensorData.sensorId,
                    type: 'LOW_TEMP',
                    message: `Low temperature detected: ${sensorData.temperature}°C`,
                    severity: 'WARNING',
                    value: sensorData.temperature,
                    threshold: this.temperatureThresholds.low,
                    location: sensorData.location
                });
            }

            // Check humidity
            if (sensorData.humidity > this.humidityThresholds.high) {
                alerts.push({
                    sensorId: sensorData.sensorId,
                    type: 'HIGH_HUMIDITY',
                    message: `High humidity detected: ${sensorData.humidity}%`,
                    severity: 'WARNING',
                    value: sensorData.humidity,
                    threshold: this.humidityThresholds.high,
                    location: sensorData.location
                });
            } else if (sensorData.humidity < this.humidityThresholds.low) {
                alerts.push({
                    sensorId: sensorData.sensorId,
                    type: 'LOW_HUMIDITY',
                    message: `Low humidity detected: ${sensorData.humidity}%`,
                    severity: 'WARNING',
                    value: sensorData.humidity,
                    threshold: this.humidityThresholds.low,
                    location: sensorData.location
                });
            }

            // Check battery level
            if (sensorData.batteryLevel < this.batteryThreshold) {
                alerts.push({
                    sensorId: sensorData.sensorId,
                    type: 'LOW_BATTERY',
                    message: `Low battery level: ${sensorData.batteryLevel}%`,
                    severity: 'CRITICAL',
                    value: sensorData.batteryLevel,
                    threshold: this.batteryThreshold,
                    location: sensorData.location
                });
            }

            // Create alerts
            if (alerts.length > 0) {
                await Alert.insertMany(alerts);
            }

            return alerts;
        } catch (error) {
            logger.error('Error checking alerts:', error);
            throw error;
        }
    }

    async getStatistics(startDate, endDate) {
        try {
            const query = {};
            if (startDate && endDate) {
                query.timestamp = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const stats = await SensorData.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        avgTemperature: { $avg: '$temperature' },
                        minTemperature: { $min: '$temperature' },
                        maxTemperature: { $max: '$temperature' },
                        avgHumidity: { $avg: '$humidity' },
                        minHumidity: { $min: '$humidity' },
                        maxHumidity: { $max: '$humidity' },
                        avgBatteryLevel: { $avg: '$batteryLevel' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            return stats[0] || {
                avgTemperature: 0,
                minTemperature: 0,
                maxTemperature: 0,
                avgHumidity: 0,
                minHumidity: 0,
                maxHumidity: 0,
                avgBatteryLevel: 0,
                count: 0
            };
        } catch (error) {
            logger.error('Error getting statistics:', error);
            throw error;
        }
    }
}

export default new SensorService();