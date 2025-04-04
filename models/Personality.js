import mongoose from 'mongoose';

const personalitySchema = new mongoose.Schema({
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
  difference: {
    type: Number,
    default: 0
  },
  aiOutput: {
    type: String,
    default: '正常範囲内の変動です'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
personalitySchema.index({ sensorId: 1, timestamp: -1 });

const Personality = mongoose.model('Personality', personalitySchema);

export default Personality;