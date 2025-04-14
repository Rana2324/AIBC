/**
 * Compatibility Script
 * 
 * This script provides global functions for inline event handlers
 * that were previously defined globally but are now in modules.
 */

// Global function to switch tabs (used by inline onclick handlers)
function switchTab(tabId, button) {
  // Hide all tabs
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.classList.remove('active'));
  
  // Deactivate all buttons
  const buttons = document.querySelectorAll('.tab-button');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  // Show the selected tab
  const selectedTab = document.getElementById(tabId);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
  
  // Activate the clicked button
  if (button) {
    button.classList.add('active');
  }
  
  // Save the active tab in local storage
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('activeTab', tabId);
  }
  
  // Dispatch custom event that tab changed
  window.dispatchEvent(new CustomEvent('tabChanged', { 
    detail: { tabId, button } 
  }));
}

// Global function to toggle sections (used by inline onclick handlers)
function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.toggle('expanded');
    
    // Toggle aria-expanded for accessibility
    const button = document.querySelector(`[aria-controls="${sectionId}"]`);
    if (button) {
      const isExpanded = section.classList.contains('expanded');
      button.setAttribute('aria-expanded', isExpanded);
    }
  }
}

// Global function to toggle theme (used by inline onclick handlers)
function toggleTheme() {
  const isDarkTheme = document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
}

// Global function to refresh data (used by inline onclick handlers)
function refreshData(sensorId) {
  if (window.SensorApp) {
    window.SensorApp.refreshData(sensorId);
  } else {
    console.error('SensorApp not loaded yet');
  }
}

// Global function to refresh alert data (used by inline onclick handlers)
function refreshAlertData(sensorId) {
  if (window.SensorApp) {
    window.SensorApp.refreshAlertData(sensorId);
  } else {
    console.error('SensorApp not loaded yet');
  }
}

// Global function to refresh system status (used by inline onclick handlers)
function refreshSystemStatus() {
  if (window.SensorApp) {
    window.SensorApp.refreshSystemStatus();
  } else {
    console.error('SensorApp not loaded yet');
  }
}

// Global function to refresh settings data (used by inline onclick handlers)
function refreshSettingsData(sensorId) {
  if (window.SensorApp) {
    window.SensorApp.refreshSettingsData(sensorId);
  } else {
    console.error('SensorApp not loaded yet');
  }
}

// Global function to refresh personality data (used by inline onclick handlers)
function refreshPersonalityData(sensorId) {
  if (window.SensorApp) {
    window.SensorApp.refreshPersonalityData(sensorId);
  } else {
    console.error('SensorApp not loaded yet');
  }
}

// Setup theme preference on page load
document.addEventListener('DOMContentLoaded', function() {
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
    document.body.classList.add('dark-theme');
  }
  
  // Add theme switcher event listener if it exists
  const themeSwitcher = document.getElementById('theme-switcher');
  if (themeSwitcher) {
    themeSwitcher.addEventListener('click', toggleTheme);
  }
});
