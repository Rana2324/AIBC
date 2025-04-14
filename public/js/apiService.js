/**
 * API Service (Browser Version)
 * Centralized service for all API calls using axios
 */

// Create axios instance with default config
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.debug(`API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    console.debug(`API Response: ${response.status} ${response.config.method.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('API Response Error:', {
        status: error.response.status,
        url: error.config.url,
        method: error.config.method.toUpperCase(),
        data: error.response.data
      });
    } else if (error.request) {
      console.error('API No Response:', {
        url: error.config.url,
        method: error.config.method.toUpperCase()
      });
    } else {
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// API methods for sensors
const sensorApi = {
  /**
   * Get all sensor data
   * @param {Object} params - Query parameters
   * @returns {Promise} - Axios promise
   */
  getAllSensorData(params = {}) {
    return api.get('/sensors', { params });
  },

  /**
   * Get data for a specific sensor
   * @param {string} sensorId - Sensor ID
   * @param {Object} params - Query parameters
   * @returns {Promise} - Axios promise
   */
  getSensorData(sensorId, params = {}) {
    return api.get(`/sensors/${sensorId}`, { params });
  },

  /**
   * Get readings for a specific sensor
   * @param {string} sensorId - Sensor ID
   * @param {Object} params - Query parameters
   * @returns {Promise} - Axios promise
   */
  getSensorReadings(sensorId, params = {}) {
    return api.get(`/sensors/${sensorId}/readings`, { params });
  }
};

/**
 * Alert API methods
 */
const alertApi = {
  /**
   * Get all alerts
   * @param {Object} params - Query parameters
   * @returns {Promise} - Axios promise
   */
  getAllAlerts(params = {}) {
    return api.get('/alerts', { params });
  },

  /**
   * Get alerts for a specific sensor
   * @param {string} sensorId - Sensor ID
   * @param {Object} params - Query parameters
   * @returns {Promise} - Axios promise
   */
  getSensorAlerts(sensorId, params = {}) {
    return api.get(`/sensors/${sensorId}/alerts`, { params });
  }
};

// Combine all API methods
const apiService = {
  ...sensorApi,
  ...alertApi
};

export default apiService;
