/**
 * Temperature Sensor Model
 */
import mongoose from 'mongoose';

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

export default TemperatureSensor;
