/**
 * General layout scripts for the temperature sensor monitoring system
 */

// Tab switching functionality
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
}

// Set the default tab on page load
document.addEventListener('DOMContentLoaded', function() {
  // Set the first tab as active by default
  const defaultTabBtn = document.getElementById('sensorTabBtn');
  if (defaultTabBtn) {
    defaultTabBtn.classList.add('active');
    const sensorTab = document.getElementById('sensorTab');
    if (sensorTab) {
      sensorTab.classList.add('active');
    }
  }
});
