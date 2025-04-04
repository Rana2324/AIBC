/**
 * Temperature Sensor Dashboard - Layout Scripts
 * Handles general UI functionality including tabs and connection status
 */

// DOM Elements
const connectionStatusEl = document.getElementById('connectionStatus');

// Socket.IO connection
let socket;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Layout scripts initialized');
  
  // Set default active tab
  const defaultTabButton = document.getElementById('sensorTabBtn');
  if (defaultTabButton) {
    defaultTabButton.click();
  }
  
  // Initialize socket connection
  initializeSocketConnection();
});

/**
 * Switch between tabs
 * @param {string} tabId - ID of the tab to display
 * @param {HTMLElement} button - The button element that was clicked
 */
function switchTab(tabId, button) {
  // Hide all tab content
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(tab => tab.classList.remove('active'));
  
  // Deactivate all tab buttons
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(btn => btn.classList.remove('active'));
  
  // Show selected tab content
  document.getElementById(tabId).classList.add('active');
  
  // Activate selected button
  button.classList.add('active');
}

/**
 * Initialize the Socket.IO connection
 */
function initializeSocketConnection() {
  try {
    // Connect to the server
    socket = io();
    
    // Connection established
    socket.on('connect', () => {
      console.log('Connected to server');
      updateConnectionStatus(true);
      
      // Listen for initial connection data
      socket.on('connection-established', (data) => {
        console.log('Connection established:', data);
      });
    });
    
    // Connection lost
    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      updateConnectionStatus(false);
    });
    
    // Connection error
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      updateConnectionStatus(false);
    });
    
  } catch (error) {
    console.error('Failed to initialize socket connection:', error);
    updateConnectionStatus(false);
  }
}

/**
 * Update the UI to reflect connection status
 * @param {boolean} isConnected - Whether the client is connected to the server
 */
function updateConnectionStatus(isConnected) {
  if (connectionStatusEl) {
    connectionStatusEl.textContent = isConnected ? 'サーバーに接続中' : 'サーバーから切断';
    connectionStatusEl.className = isConnected 
      ? 'connection-status connected'
      : 'connection-status disconnected';
    
    // Add a brief animation to draw attention to status changes
    connectionStatusEl.classList.add('status-changed');
    setTimeout(() => {
      connectionStatusEl.classList.remove('status-changed');
    }, 800);
  }
}

/**
 * Toggle the expansion state of a table
 * @param {string} tableWrapperId - ID of the table wrapper element to toggle
 */
function toggleTableExpand(tableWrapperId) {
  const tableWrapper = document.getElementById(tableWrapperId);
  const button = event.currentTarget;
  
  if (tableWrapper) {
    const isExpanded = tableWrapper.classList.toggle('expanded');
    
    // Update the button text and icon
    if (button) {
      const textEl = button.querySelector('.toggle-text');
      const iconEl = button.querySelector('.toggle-icon');
      
      if (textEl) textEl.textContent = isExpanded ? '折りたたみ' : '展開';
      if (iconEl) button.setAttribute('aria-expanded', isExpanded);
    }
  }
}