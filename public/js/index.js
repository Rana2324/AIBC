/**
 * Temperature Sensor Monitoring System
 * Main JavaScript file - imports and initializes modular components
 */

// Import modules
import SensorApp from './sensorApp.js';
import DataService from './dataService.js';
import uiUtils from './uiUtils.js';

// Make modules available globally for legacy code
window.SensorApp = SensorApp;
window.DataService = DataService;
window.UIManager = uiUtils;

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing application...');
  
  // Initialize the sensor application
  SensorApp.init();
  
  // Add event listeners for refresh buttons
  setupRefreshButtons();
});

/**
 * Setup event listeners for refresh buttons
 */
function setupRefreshButtons() {
  // Get all refresh buttons
  const refreshButtons = document.querySelectorAll('.info-refresh');
  
  // Add click event listeners
  refreshButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      // Prevent default action
      event.preventDefault();
      
      // Get the parent section to determine what to refresh
      const section = button.closest('.sensor-data-section, .section-header');
      
      if (section) {
        // Get the sensor ID from the parent section
        const sensorSection = section.closest('[id^="sensor-"]');
        const sensorId = sensorSection ? sensorSection.id.replace('sensor-', '') : null;
        
        // Determine what to refresh based on the button's location
        if (section.querySelector('.section-controls h3')?.textContent.includes('取得データ履歴')) {
          SensorApp.refreshData(sensorId);
        } else if (section.querySelector('h3')?.textContent.includes('アラート履歴')) {
          SensorApp.refreshAlertData(sensorId);
        } else if (section.querySelector('h3')?.textContent.includes('設定変更履歴')) {
          SensorApp.refreshSettingsData(sensorId);
        } else if (section.querySelector('h3')?.textContent.includes('個性')) {
          SensorApp.refreshPersonalityData(sensorId);
        } else if (section.querySelector('h3')?.textContent.includes('システム状態')) {
          SensorApp.refreshSystemStatus();
        }
      }
    });
  });
}
