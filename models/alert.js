/**
 * Alert Model
 */
import mongoose from 'mongoose';

// Define Alert Schema
const alertSchema = new mongoose.Schema({
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
  alert_reason: {
    type: String,
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

// Create Alert Model
const Alert = mongoose.model('Alert', alertSchema);

export default Alert;
