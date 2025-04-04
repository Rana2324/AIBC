import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  sensorId: {
    type: String,
    required: [true, 'Sensor ID is required'],
    trim: true
  },
  date: {
    type: String,
    required: [true, 'Date is required']
  },
  time: {
    type: String,
    required: [true, 'Time is required']
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  changedBy: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true
});

// Index for efficient queries
settingSchema.index({ sensorId: 1, timestamp: -1 });

const Setting = mongoose.model('Setting', settingSchema);

export default Setting;