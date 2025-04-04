import Alert from '../models/Alert.js';
import logger from '../utils/logger.js';

class AlertService {
    async getActiveAlerts(location = null) {
        try {
            const query = { resolved: false };
            if (location) {
                query.location = location;
            }
            return await Alert.find(query).sort({ timestamp: -1 });
        } catch (error) {
            logger.error('Error getting active alerts:', error);
            throw error;
        }
    }

    async getAlertHistory(startDate, endDate, location = null) {
        try {
            const query = {};
            if (startDate && endDate) {
                query.timestamp = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }
            if (location) {
                query.location = location;
            }
            return await Alert.find(query).sort({ timestamp: -1 });
        } catch (error) {
            logger.error('Error getting alert history:', error);
            throw error;
        }
    }

    async resolveAlert(alertId) {
        try {
            const alert = await Alert.findById(alertId);
            if (!alert) {
                throw new Error('Alert not found');
            }
            alert.resolved = true;
            alert.resolvedAt = new Date();
            await alert.save();
            return alert;
        } catch (error) {
            logger.error('Error resolving alert:', error);
            throw error;
        }
    }

    async getAlertStatistics(startDate, endDate) {
        try {
            const query = {};
            if (startDate && endDate) {
                query.timestamp = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const stats = await Alert.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        resolvedCount: {
                            $sum: { $cond: ['$resolved', 1, 0] }
                        },
                        criticalCount: {
                            $sum: { $cond: [{ $eq: ['$severity', 'CRITICAL'] }, 1, 0] }
                        }
                    }
                }
            ]);

            return stats.reduce((acc, curr) => {
                acc[curr._id] = {
                    total: curr.count,
                    resolved: curr.resolvedCount,
                    critical: curr.criticalCount
                };
                return acc;
            }, {});
        } catch (error) {
            logger.error('Error getting alert statistics:', error);
            throw error;
        }
    }
}

export default new AlertService();