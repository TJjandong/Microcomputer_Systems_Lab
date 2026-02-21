/**
 * index_client.js - Client-side JavaScript for Lab 7
 * 
 * This file handles all the frontend interactivity:
 * 1. AJAX polling for ADC values (DETECT mode)
 * 2. Mode switching between DETECT and NO_DETECT
 * 3. Manual LED control (NO_DETECT mode)
 * 4. UI updates without page reload
 */

// =============================================================================
// GLOBAL STATE
// =============================================================================

// Current operating mode: 'detect' or 'no_detect'
let currentMode = 'detect';

// Interval ID for AJAX polling (so we can stop it when switching modes)
let pollingInterval = null;

// Polling rate in milliseconds (1 second = 1000ms)
const POLLING_RATE = 1000;

// Maximum number of status messages to display
const MAX_STATUS_MESSAGES = 5;

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the application when the page loads.
 * This sets up the initial state and starts polling if in DETECT mode.
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Lab 7 Frontend initialized');
    
    // Get the initial mode from the server
    fetchCurrentMode();
    
    // Start polling for ADC values (DETECT mode is default)
    startPolling();
    
    // Update connection status
    updateConnectionStatus('connected', '狀態: 已連線');
});

// =============================================================================
// MODE SWITCHING
// =============================================================================

/**
 * Fetch the current mode from the server.
 * This ensures the frontend is synchronized with the backend state.
 */
async function fetchCurrentMode() {
    try {
        const response = await fetch('/api/mode');
        const data = await response.json();
        
        currentMode = data.mode;
        updateModeUI();
        
        console.log('Current mode:', currentMode);
    } catch (error) {
        console.error('Error fetching mode:', error);
    }
}

/**
 * Switch between DETECT and NO_DETECT modes.
 * Called when the user clicks the "Submit (切換模式)" button.
 */
async function switchMode() {
    // Get the selected mode from radio buttons
    const selectedMode = document.querySelector('input[name="mode"]:checked').value;
    
    // If same mode, no need to switch
    if (selectedMode === currentMode) {
        addStatusMessage(`已經在 ${getModeDisplayName(currentMode)} 模式`, 'info');
        return;
    }
    
    try {
        // Send mode change request to server
        const response = await fetch('/api/mode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mode: selectedMode })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update local state
            currentMode = data.mode;
            
            // Update the UI
            updateModeUI();
            
            // Show success message
            addStatusMessage(data.message, 'success');
            
            console.log('Mode switched to:', currentMode);
        } else {
            addStatusMessage(`切換失敗: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error switching mode:', error);
        addStatusMessage(`切換失敗: ${error.message}`, 'error');
        updateConnectionStatus('error', '狀態: 連線錯誤');
    }
}

/**
 * Update the UI based on the current mode.
 * Shows/hides the appropriate panels and starts/stops polling.
 */
function updateModeUI() {
    const detectPanel = document.getElementById('detect-panel');
    const noDetectPanel = document.getElementById('no-detect-panel');
    
    // Update radio button selection
    document.getElementById('mode-detect').checked = (currentMode === 'detect');
    document.getElementById('mode-no-detect').checked = (currentMode === 'no_detect');
    
    if (currentMode === 'detect') {
        // Show DETECT panel, hide NO_DETECT panel
        detectPanel.style.display = 'block';
        noDetectPanel.style.display = 'none';
        
        // Start polling for ADC values
        startPolling();
    } else {
        // Show NO_DETECT panel, hide DETECT panel
        detectPanel.style.display = 'none';
        noDetectPanel.style.display = 'block';
        
        // Stop polling (manual mode doesn't need continuous updates)
        stopPolling();
        
        // Reset LED indicators in DETECT panel
        resetLedIndicators();
    }
}

/**
 * Get a display-friendly name for the mode.
 */
function getModeDisplayName(mode) {
    return mode === 'detect' ? 'DETECT (自動感測)' : 'NO_DETECT (手動控制)';
}

// =============================================================================
// ADC POLLING (DETECT MODE)
// =============================================================================

/**
 * Start polling the server for ADC values.
 * This creates a setInterval that calls fetchAdcValue every POLLING_RATE ms.
 */
function startPolling() {
    // Don't start if already polling
    if (pollingInterval !== null) {
        return;
    }
    
    console.log('Starting ADC polling...');
    
    // Fetch immediately, then set up interval
    fetchAdcValue();
    
    // Set up recurring fetch
    pollingInterval = setInterval(fetchAdcValue, POLLING_RATE);
}

/**
 * Stop polling for ADC values.
 */
function stopPolling() {
    if (pollingInterval !== null) {
        console.log('Stopping ADC polling...');
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

/**
 * Fetch the current ADC value from the server.
 * This is the main AJAX call for DETECT mode.
 */
async function fetchAdcValue() {
    try {
        const response = await fetch('/api/adc');
        const data = await response.json();
        
        // Update the UI with the received data
        updateAdcDisplay(data);
        
        // Update connection status
        updateConnectionStatus('connected', '狀態: 已連線');
        
    } catch (error) {
        console.error('Error fetching ADC value:', error);
        updateConnectionStatus('error', '狀態: 連線錯誤');
        
        // Show error in ADC display
        document.getElementById('adc-value').textContent = 'ERR';
        document.getElementById('adc-value').className = 'adc-value';
    }
}

/**
 * Update the ADC display with new data from the server.
 * 
 * @param {Object} data - The data from /api/adc endpoint
 * @param {number} data.adc - ADC value (0-1023)
 * @param {string} data.level - Light level ('bright', 'medium', 'dark')
 * @param {boolean} data.led1 - LED 1 state
 * @param {boolean} data.led2 - LED 2 state
 */
function updateAdcDisplay(data) {
    // Update ADC value
    const adcValueElement = document.getElementById('adc-value');
    adcValueElement.textContent = data.adc;
    adcValueElement.className = `adc-value ${data.level}`;
    
    // Update light level display
    const levelElement = document.getElementById('light-level');
    levelElement.textContent = getLevelDisplayName(data.level);
    levelElement.className = `level-value ${data.level}`;
    
    // Update LED indicators
    updateLedIndicator('led1-indicator', data.led1);
    updateLedIndicator('led2-indicator', data.led2);
}

/**
 * Get a display-friendly name for the light level.
 */
function getLevelDisplayName(level) {
    switch (level) {
        case 'bright': return '亮 (Bright)';
        case 'medium': return '中 (Medium)';
        case 'dark': return '暗 (Dark)';
        default: return level;
    }
}

/**
 * Update an LED indicator element.
 * 
 * @param {string} elementId - The ID of the LED indicator element
 * @param {boolean} isOn - Whether the LED is on
 */
function updateLedIndicator(elementId, isOn) {
    const element = document.getElementById(elementId);
    if (element) {
        element.className = isOn ? 'led-light on' : 'led-light';
    }
}

/**
 * Reset LED indicators to off state.
 */
function resetLedIndicators() {
    updateLedIndicator('led1-indicator', false);
    updateLedIndicator('led2-indicator', false);
}

// =============================================================================
// MANUAL LED CONTROL (NO_DETECT MODE)
// =============================================================================

/**
 * Set an LED to the selected state.
 * Called when the user clicks a "送出" button in NO_DETECT mode.
 * 
 * @param {number} ledNum - Which LED (1 or 2)
 */
async function setLed(ledNum) {
    // Get the selected state for this LED
    const selectedState = document.querySelector(`input[name="led${ledNum}"]:checked`);
    
    if (!selectedState) {
        addStatusMessage(`請先選擇 LED ${ledNum} 的狀態`, 'error');
        return;
    }
    
    const state = selectedState.value;
    
    try {
        // Send LED control request to server
        const response = await fetch('/api/led', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                led: ledNum, 
                state: state 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Format the timestamp for display
            const time = new Date(data.timestamp).toLocaleTimeString('zh-TW');
            
            // Show success message with timestamp
            const stateDisplay = state === 'on' ? 'ON' : 'OFF';
            addStatusMessage(`LED${ledNum} is now ${stateDisplay} (${time})`, 'success');
            
            console.log('LED set:', data);
        } else {
            addStatusMessage(`設定失敗: ${data.error}`, 'error');
        }
    } catch (error) {
        console.error('Error setting LED:', error);
        addStatusMessage(`設定失敗: ${error.message}`, 'error');
        updateConnectionStatus('error', '狀態: 連線錯誤');
    }
}

// =============================================================================
// STATUS MESSAGES
// =============================================================================

/**
 * Add a status message to the status message display area.
 * This is used to show feedback in NO_DETECT mode (same page, no reload).
 * 
 * @param {string} message - The message to display
 * @param {string} type - Message type: 'success', 'error', or 'info'
 */
function addStatusMessage(message, type = 'info') {
    const container = document.getElementById('status-message');
    
    // Create new status item
    const item = document.createElement('div');
    item.className = `status-item ${type}`;
    item.textContent = message;
    
    // Add to beginning of container
    container.insertBefore(item, container.firstChild);
    
    // Remove old messages if too many
    while (container.children.length > MAX_STATUS_MESSAGES) {
        container.removeChild(container.lastChild);
    }
}

/**
 * Update the connection status display in the footer.
 * 
 * @param {string} status - 'connected' or 'error'
 * @param {string} message - Status message to display
 */
function updateConnectionStatus(status, message) {
    const element = document.getElementById('connection-status');
    element.textContent = message;
    element.className = status;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format a date for display.
 * 
 * @param {Date} date - Date object to format
 * @returns {string} Formatted time string
 */
function formatTime(date) {
    return date.toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}
