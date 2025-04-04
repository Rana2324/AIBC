import mongoose from 'mongoose';

const blockchainRecordSchema = new mongoose.Schema({
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
    ipfsCid: {
        type: String,
        default: ''
    },
    txHash: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['処理中', '完了', 'エラー'],
        default: '処理中'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient queries
blockchainRecordSchema.index({ modelId: 1, timestamp: -1 });
blockchainRecordSchema.index({ status: 1, timestamp: -1 });

const BlockchainRecord = mongoose.model('BlockchainRecord', blockchainRecordSchema);

export default BlockchainRecord;