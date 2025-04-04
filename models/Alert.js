/**
 * Alert Model
 * Used to track temperature anomalies and notify users
 */
import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  sensorId: {
    type: String,
    required: [true, 'Sensor ID is required'],
    trim: true,
  },
  type: {
    type: String,
    required: [true, 'Alert type is required'],
    enum: ['HIGH_TEMP', 'LOW_TEMP', 'HIGH_HUMIDITY', 'LOW_HUMIDITY', 'LOW_BATTERY'],
  },
  message: {
    type: String,
    required: [true, 'Alert message is required'],
  },
  severity: {
    type: String,
    required: [true, 'Alert severity is required'],
    enum: ['INFO', 'WARNING', 'CRITICAL'],
    default: 'INFO',
  },
  value: {
    type: Number,
    required: [true, 'Alert value is required'],
  },
  threshold: {
    type: Number,
    required: [true, 'Alert threshold is required'],
  },
  location: {
    type: String,
    required: [true, 'Sensor location is required'],
    trim: true,
  },
  resolved: {
    type: Boolean,
    default: false,
  },
  resolvedAt: {
    type: Date,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
alertSchema.index({ sensorId: 1, timestamp: -1 });
alertSchema.index({ type: 1, severity: 1 });
alertSchema.index({ resolved: 1, timestamp: -1 });
alertSchema.index({ location: 1, timestamp: -1 });

// Instance method to resolve an alert
alertSchema.methods.resolve = function () {
  this.resolved = true;
  this.resolvedAt = new Date();
  return this.save();
};

// Static method to find active alerts
alertSchema.statics.findActive = function (location = null) {
  const query = { resolved: false };
  if (location) {
    query.location = location;
  }
  return this.find(query).sort({ timestamp: -1 });
};

export default mongoose.model('Alert', alertSchema);