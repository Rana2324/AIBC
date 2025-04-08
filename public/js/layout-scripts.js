/**
 * General layout scripts for the temperature sensor monitoring system
 * Handles layout functionality that is shared across all pages
 */

/**
 * Switch between tabs and update UI accordingly
 * @param {string} tabId - The ID of the tab content to show
 * @param {Element} button - The button element that was clicked
 */
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

/**
 * Get the active tab from localStorage
 * @returns {string} The ID of the active tab or default tab ID
 */
function getActiveTab() {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('activeTab') || 'sensorTab';
  }
  return 'sensorTab'; // Default tab
}

/**
 * Handle toggling of expandable sections
 * @param {string} sectionId - The ID of the section to toggle
 */
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

// Set the default tab on page load
document.addEventListener('DOMContentLoaded', function() {
  // Set tab from localStorage or default to first tab
  const storedTabId = getActiveTab();
  const tabButton = document.getElementById(`${storedTabId.replace('Tab', '')}TabBtn`);
  
  if (tabButton) {
    switchTab(storedTabId, tabButton);
  } else {
    // Fall back to first tab if stored tab doesn't exist
    const defaultTabBtn = document.getElementById('sensorTabBtn');
    if (defaultTabBtn) {
      defaultTabBtn.classList.add('active');
      const sensorTab = document.getElementById('sensorTab');
      if (sensorTab) {
        sensorTab.classList.add('active');
      }
    }
  }
  
  // Setup theme preference if available
  setupThemePreference();
});

/**
 * Setup theme preference (light/dark mode)
 */
function setupThemePreference() {
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
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
  const isDarkTheme = document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
}
