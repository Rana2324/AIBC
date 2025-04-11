/**
 * Utility functions related to sensor data and alerts
 */
import Alert from '../models/alert.js';
import TemperatureSensor from '../models/temperatureSensor.js';
import logger from './logger.js';

/**
 * Utility function to check for missing required fields.
 */
export const checkMissingFields = (data, requiredFields) => {
  return requiredFields.filter(field => !data[field]);
};

/**
 * Utility function to emit event to connected clients.
 */
export const emitToClients = (io, event, data) => {
  io.emit(event, data);
};

/**
 * Utility function to create a new alert.
 */
export const createAlert = async (sensorData, alertReason) => {
  const alert = new Alert({
    sensor_id: sensorData.sensor_id,
    date: sensorData.date,
    time: sensorData.time,
    alert_reason: alertReason,
    status: 'alert',
    created_at: new Date(),
  });

  await alert.save();
  logger.info('Created new alert', {
    sensorId: alert.sensor_id,
    reason: alert.alert_reason,
    temperature: sensorData.average_temp,
  });

  return alert;
};

/**
 * Utility function to fetch latest readings and alerts.
 */
export const fetchLatestReadingsAndAlerts = async (limit = 100) => {
  const readings = await TemperatureSensor.find().sort({ created_at: -1 }).limit(limit);
  const alerts = await Alert.find().sort({ created_at: -1 }).limit(10);
  return { readings, alerts };
};