import mongoose from 'mongoose';

const modelUpdateSchema = new mongoose.Schema({
  modelId: {
    type: String,
    required: [true, 'Model ID is required'],
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
  aiOutput: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
modelUpdateSchema.index({ modelId: 1, timestamp: -1 });

const ModelUpdate = mongoose.model('ModelUpdate', modelUpdateSchema);

export default ModelUpdate;