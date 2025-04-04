/**
 * Sensor Data Model
 */
import mongoose from 'mongoose';

const sensorDataSchema = new mongoose.Schema({
  sensorId: {
    type: String,
    required: [true, 'Sensor ID is required'],
    trim: true,
  },
  temperature: {
    type: Number,
    required: [true, 'Temperature reading is required'],
  },
  humidity: {
    type: Number,
    required: [true, 'Humidity reading is required'],
    min: [0, 'Humidity cannot be less than 0%'],
    max: [100, 'Humidity cannot be more than 100%'],
  },
  location: {
    type: String,
    required: [true, 'Sensor location is required'],
    trim: true,
  },
  batteryLevel: {
    type: Number,
    required: [true, 'Battery level is required'],
    min: [0, 'Battery level cannot be less than 0%'],
    max: [100, 'Battery level cannot be more than 100%'],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
sensorDataSchema.index({ sensorId: 1, timestamp: -1 });
sensorDataSchema.index({ location: 1, timestamp: -1 });

// Virtual for temperature in Fahrenheit
sensorDataSchema.virtual('temperatureF').get(function () {
  return (this.temperature * 9 / 5) + 32;
});

// Static method to find abnormal readings
sensorDataSchema.statics.findAbnormal = function (startDate, endDate = new Date()) {
  return this.find({
    temperature: { $gt: 30 }, // High temperature threshold
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ timestamp: -1 });
};

export default mongoose.model('SensorData', sensorDataSchema);