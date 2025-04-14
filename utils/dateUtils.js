/**
 * Date Utility Functions
 * Centralized date and time formatting utilities
 */

/**
 * Format a date to YYYY-MM-DD
 * @param {Date|string} date - Date object or date string
 * @returns {string} - Formatted date string
 */
export const formatDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * Format a date to HH:MM:SS
 * @param {Date|string} date - Date object or date string
 * @returns {string} - Formatted time string
 */
export const formatTime = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return d.toTimeString().split(' ')[0];
};

/**
 * Get a formatted timestamp string (YYYY-MM-DD HH:MM:SS)
 * @param {Date|string} date - Date object or date string
 * @returns {string} - Formatted timestamp string
 */
export const formatTimestamp = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${formatDate(d)} ${formatTime(d)}`;
};

/**
 * Get a relative time string (e.g., "5 minutes ago")
 * @param {Date|string} date - Date object or date string
 * @returns {string} - Relative time string
 */
export const getRelativeTimeString = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now - d;
  
  // Convert to seconds
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) {
    return `${diffSec}秒前`;
  }
  
  // Convert to minutes
  const diffMin = Math.floor(diffSec / 60);
  
  if (diffMin < 60) {
    return `${diffMin}分前`;
  }
  
  // Convert to hours
  const diffHour = Math.floor(diffMin / 60);
  
  if (diffHour < 24) {
    return `${diffHour}時間前`;
  }
  
  // Convert to days
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay < 30) {
    return `${diffDay}日前`;
  }
  
  // Convert to months
  const diffMonth = Math.floor(diffDay / 30);
  
  if (diffMonth < 12) {
    return `${diffMonth}ヶ月前`;
  }
  
  // Convert to years
  const diffYear = Math.floor(diffMonth / 12);
  return `${diffYear}年前`;
};

export default {
  formatDate,
  formatTime,
  formatTimestamp,
  getRelativeTimeString
};
