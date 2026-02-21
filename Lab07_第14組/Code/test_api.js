/**
 * test_api.js - Test script for Lab 7 API endpoints
 * 
 * This script tests all the API endpoints to make sure they work correctly.
 * Run this after starting the server with: node index.js
 * 
 * Usage:
 *   1. Start the server: node index.js
 *   2. In another terminal: node test_api.js
 */

const http = require("http");

const BASE_URL = "http://localhost:8080";

// Helper function to make HTTP requests
function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                "Content-Type": "application/json"
            }
        };
        
        const req = http.request(options, (res) => {
            let data = "";
            
            res.on("data", (chunk) => {
                data += chunk;
            });
            
            res.on("end", () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        
        req.on("error", (error) => {
            reject(error);
        });
        
        if (body) {
            req.write(JSON.stringify(body));
        }
        
        req.end();
    });
}

// Test functions
async function testGetAdc() {
    console.log("\n--- Test: GET /api/adc ---");
    const result = await makeRequest("GET", "/api/adc");
    console.log("Status:", result.status);
    console.log("Response:", JSON.stringify(result.data, null, 2));
    
    // Verify response structure
    const data = result.data;
    if (typeof data.adc === "number" && 
        typeof data.level === "string" && 
        typeof data.led1 === "boolean" && 
        typeof data.led2 === "boolean") {
        console.log("✓ Response structure is correct");
    } else {
        console.log("✗ Response structure is incorrect");
    }
}

async function testSetLed() {
    console.log("\n--- Test: POST /api/led (LED 1 ON) ---");
    let result = await makeRequest("POST", "/api/led", { led: 1, state: "on" });
    console.log("Status:", result.status);
    console.log("Response:", JSON.stringify(result.data, null, 2));
    
    console.log("\n--- Test: POST /api/led (LED 2 OFF) ---");
    result = await makeRequest("POST", "/api/led", { led: 2, state: "off" });
    console.log("Status:", result.status);
    console.log("Response:", JSON.stringify(result.data, null, 2));
    
    console.log("\n--- Test: POST /api/led (Invalid LED) ---");
    result = await makeRequest("POST", "/api/led", { led: 99, state: "on" });
    console.log("Status:", result.status);
    console.log("Response:", JSON.stringify(result.data, null, 2));
}

async function testModeSwitch() {
    console.log("\n--- Test: GET /api/mode ---");
    let result = await makeRequest("GET", "/api/mode");
    console.log("Status:", result.status);
    console.log("Response:", JSON.stringify(result.data, null, 2));
    
    console.log("\n--- Test: POST /api/mode (switch to no_detect) ---");
    result = await makeRequest("POST", "/api/mode", { mode: "no_detect" });
    console.log("Status:", result.status);
    console.log("Response:", JSON.stringify(result.data, null, 2));
    
    console.log("\n--- Test: POST /api/mode (switch to detect) ---");
    result = await makeRequest("POST", "/api/mode", { mode: "detect" });
    console.log("Status:", result.status);
    console.log("Response:", JSON.stringify(result.data, null, 2));
}

async function testMockEndpoints() {
    console.log("\n--- Test: POST /mock/setadc (set to 200 - bright) ---");
    let result = await makeRequest("POST", "/mock/setadc", { value: 200 });
    console.log("Status:", result.status);
    console.log("Response:", JSON.stringify(result.data, null, 2));
    
    console.log("\n--- Test: GET /api/adc (should show bright) ---");
    result = await makeRequest("GET", "/api/adc");
    console.log("Status:", result.status);
    console.log("Response:", JSON.stringify(result.data, null, 2));
    
    console.log("\n--- Test: POST /mock/setadc (set to 700 - dark) ---");
    result = await makeRequest("POST", "/mock/setadc", { value: 700 });
    console.log("Status:", result.status);
    console.log("Response:", JSON.stringify(result.data, null, 2));
    
    console.log("\n--- Test: GET /api/adc (should show dark) ---");
    result = await makeRequest("GET", "/api/adc");
    console.log("Status:", result.status);
    console.log("Response:", JSON.stringify(result.data, null, 2));
    
    console.log("\n--- Test: GET /mock/status ---");
    result = await makeRequest("GET", "/mock/status");
    console.log("Status:", result.status);
    console.log("Response:", JSON.stringify(result.data, null, 2));
}

// Run all tests
async function runAllTests() {
    console.log("=".repeat(60));
    console.log("LAB 7 API ENDPOINT TESTS");
    console.log("=".repeat(60));
    console.log("Make sure the server is running: node index.js");
    
    try {
        await testGetAdc();
        await testSetLed();
        await testModeSwitch();
        await testMockEndpoints();
        
        console.log("\n" + "=".repeat(60));
        console.log("ALL TESTS COMPLETED!");
        console.log("=".repeat(60));
    } catch (error) {
        console.error("\nError running tests:", error.message);
        console.log("\nMake sure the server is running on port 8080");
    }
}

runAllTests();