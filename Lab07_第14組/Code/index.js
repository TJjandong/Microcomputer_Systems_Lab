/**
 * index.js - Node.js Backend for Lab 7
 * Photoresistor ADC Monitoring with Web Control
 * 
 * This server provides endpoints for:
 * 1. Serving the static web interface
 * 2. Reading ADC values from the photoresistor (DETECT mode)
 * 3. Manual LED control (NO_DETECT mode)
 * 4. Switching between modes
 * 
 * Key difference from Lab 4:
 * - Uses res.json() instead of res.redirect() for AJAX responses
 * - Spawns Python processes and captures their stdout
 */

const express = require("express");
const { spawn } = require("child_process");
const path = require("path");

const app = express();

// =============================================================================
// MIDDLEWARE SETUP
// =============================================================================

// Serve static files (HTML, CSS, client-side JS) from the 'public' folder
app.use(express.static("./public"));

// Parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true }));

// Parse JSON bodies (for AJAX requests)
app.use(express.json());

// =============================================================================
// CONFIGURATION
// =============================================================================

// Path to Python scripts (adjust this based on your project structure)
const PYTHON_PATH = "python3";
const SCRIPTS_DIR = path.join(__dirname, "python");

// For testing without hardware, set this to true
// When true, it returns simulated data instead of calling Python scripts
const MOCK_MODE = true;

// Simulated ADC value for testing (can be changed via /mock/setadc endpoint)
let mockAdcValue = 450;

// Track current mode (for frontend synchronization)
let currentMode = "detect"; // "detect" or "no_detect"

// =============================================================================
// HELPER FUNCTION: Run Python Script
// =============================================================================

/**
 * Executes a Python script and returns its output via Promise.
 * 
 * This is the bridge between Node.js and our Python GPIO code.
 * The Python scripts print their output to stdout, which we capture here.
 * 
 * @param {string} scriptName - Name of the Python script (e.g., "read_adc.py")
 * @param {Array} args - Command line arguments to pass to the script
 * @returns {Promise<string>} - Resolves with stdout, rejects with error
 */
function runPythonScript(scriptName, args = []) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(SCRIPTS_DIR, scriptName);
        
        // Spawn the Python process
        // Note: On Jetson, you might need to use "sudo" for GPIO access
        const process = spawn(PYTHON_PATH, [scriptPath, ...args]);
        
        let stdout = "";
        let stderr = "";
        
        // Capture stdout (this is where our Python scripts print their results)
        process.stdout.on("data", (data) => {
            stdout += data.toString();
        });
        
        // Capture stderr (for error messages)
        process.stderr.on("data", (data) => {
            stderr += data.toString();
        });
        
        // Handle process completion
        process.on("close", (code) => {
            if (code === 0) {
                resolve(stdout.trim());
            } else {
                reject(new Error(`Python script exited with code ${code}: ${stderr}`));
            }
        });
        
        // Handle process errors (e.g., script not found)
        process.on("error", (error) => {
            reject(new Error(`Failed to start Python script: ${error.message}`));
        });
    });
}

// =============================================================================
// MOCK FUNCTIONS (for testing without hardware)
// =============================================================================

/**
 * Simulates the auto_blink.py output for testing.
 * Returns the same JSON structure that the real script would return.
 */
function getMockAutoBlinkData() {
    const THRESHOLD_LOW = 300;
    const THRESHOLD_HIGH = 600;
    
    let level, led1, led2;
    
    if (mockAdcValue < THRESHOLD_LOW) {
        level = "bright";
        led1 = false;
        led2 = false;
    } else if (mockAdcValue < THRESHOLD_HIGH) {
        level = "medium";
        led1 = true;
        led2 = false;
    } else {
        level = "dark";
        led1 = true;
        led2 = true;
    }
    
    return {
        adc: mockAdcValue,
        level: level,
        led1: led1,
        led2: led2,
        thresholds: {
            low: THRESHOLD_LOW,
            high: THRESHOLD_HIGH
        }
    };
}

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * GET /api/adc
 * 
 * Returns the current ADC value and LED states (DETECT mode).
 * Called periodically by the frontend using setInterval + AJAX.
 * 
 * Response format:
 * {
 *   "adc": 450,
 *   "level": "medium",
 *   "led1": true,
 *   "led2": false,
 *   "thresholds": { "low": 300, "high": 600 }
 * }
 */
app.get("/api/adc", async (req, res) => {
    try {
        if (MOCK_MODE) {
            // Return simulated data for testing
            const data = getMockAutoBlinkData();
            console.log(`[MOCK] ADC value: ${data.adc}, Level: ${data.level}`);
            res.json(data);
        } else {
            // Call the real Python script
            const output = await runPythonScript("auto_blink.py");
            const data = JSON.parse(output);
            console.log(`[REAL] ADC value: ${data.adc}, Level: ${data.level}`);
            res.json(data);
        }
    } catch (error) {
        console.error("Error reading ADC:", error.message);
        res.status(500).json({
            error: error.message,
            adc: -1,
            level: "error",
            led1: false,
            led2: false
        });
    }
});

/**
 * POST /api/led
 * 
 * Manually control an LED (NO_DETECT mode).
 * 
 * Request body:
 * {
 *   "led": 1,        // LED number (1 or 2)
 *   "state": "on"    // "on" or "off"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "LED1:ON",
 *   "led": 1,
 *   "state": "on",
 *   "timestamp": "2024-12-05T10:30:00.000Z"
 * }
 */
app.post("/api/led", async (req, res) => {
    const { led, state } = req.body;
    
    // Validate input
    if (!led || !state) {
        return res.status(400).json({
            success: false,
            error: "Missing required fields: led and state"
        });
    }
    
    const ledNum = parseInt(led);
    const ledState = state.toLowerCase();
    
    if (![1, 2].includes(ledNum)) {
        return res.status(400).json({
            success: false,
            error: "Invalid LED number. Must be 1 or 2."
        });
    }
    
    if (!["on", "off"].includes(ledState)) {
        return res.status(400).json({
            success: false,
            error: "Invalid state. Must be 'on' or 'off'."
        });
    }
    
    try {
        if (MOCK_MODE) {
            // Simulate LED control
            console.log(`[MOCK] Setting LED ${ledNum} to ${ledState.toUpperCase()}`);
            res.json({
                success: true,
                message: `LED${ledNum}:${ledState.toUpperCase()}`,
                led: ledNum,
                state: ledState,
                timestamp: new Date().toISOString()
            });
        } else {
            // Call the real Python script
            const output = await runPythonScript("set_led.py", [ledNum.toString(), ledState]);
            console.log(`[REAL] LED control result: ${output}`);
            res.json({
                success: true,
                message: output,
                led: ledNum,
                state: ledState,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error("Error setting LED:", error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/mode
 * 
 * Switch between DETECT and NO_DETECT modes.
 * When switching to NO_DETECT, turns off all LEDs first.
 * 
 * Request body:
 * {
 *   "mode": "detect"  // or "no_detect"
 * }
 */
app.post("/api/mode", async (req, res) => {
    const { mode } = req.body;
    
    if (!["detect", "no_detect"].includes(mode)) {
        return res.status(400).json({
            success: false,
            error: "Invalid mode. Must be 'detect' or 'no_detect'."
        });
    }
    
    try {
        // When switching modes, turn off all LEDs first for a clean state
        if (MOCK_MODE) {
            console.log(`[MOCK] Switching to ${mode} mode, turning off LEDs`);
        } else {
            await runPythonScript("leds_off.py");
        }
        
        currentMode = mode;
        console.log(`Mode changed to: ${mode}`);
        
        res.json({
            success: true,
            mode: currentMode,
            message: `Switched to ${mode === "detect" ? "DETECT (Auto)" : "NO_DETECT (Manual)"} mode`
        });
    } catch (error) {
        console.error("Error switching mode:", error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/mode
 * 
 * Get the current mode.
 */
app.get("/api/mode", (req, res) => {
    res.json({
        mode: currentMode
    });
});

// =============================================================================
// MOCK TESTING ENDPOINTS (only available when MOCK_MODE is true)
// =============================================================================

if (MOCK_MODE) {
    /**
     * POST /mock/setadc
     * 
     * Set the simulated ADC value for testing.
     * This allows you to test different light levels without hardware.
     * 
     * Request body:
     * {
     *   "value": 500  // ADC value 0-1023
     * }
     */
    app.post("/mock/setadc", (req, res) => {
        const { value } = req.body;
        
        if (typeof value !== "number" || value < 0 || value > 1023) {
            return res.status(400).json({
                success: false,
                error: "Value must be a number between 0 and 1023"
            });
        }
        
        mockAdcValue = value;
        console.log(`[MOCK] ADC value set to: ${mockAdcValue}`);
        
        res.json({
            success: true,
            value: mockAdcValue
        });
    });
    
    /**
     * GET /mock/status
     * 
     * Get the current mock status.
     */
    app.get("/mock/status", (req, res) => {
        res.json({
            mockMode: true,
            adcValue: mockAdcValue,
            currentMode: currentMode
        });
    });
}

// =============================================================================
// START SERVER
// =============================================================================

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log("=".repeat(60));
    console.log("Lab 7 - Photoresistor ADC Monitoring Server");
    console.log("=".repeat(60));
    console.log(`Server running on: http://localhost:${PORT}`);
    console.log(`Mock mode: ${MOCK_MODE ? "ENABLED (no hardware needed)" : "DISABLED (using real hardware)"}`);
    if (MOCK_MODE) {
        console.log(`Initial mock ADC value: ${mockAdcValue}`);
        console.log("");
        console.log("Testing endpoints available:");
        console.log("  POST /mock/setadc - Set simulated ADC value");
        console.log("  GET  /mock/status - Get mock status");
    }
    console.log("=".repeat(60));
});
