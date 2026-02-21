#!/usr/bin/env python3
"""
auto_blink.py - Automatic LED blink control based on light level

This script is designed to be called ONCE by Node.js to get the current
ADC value and trigger appropriate LED behavior. It does NOT run in an
infinite loop - that would block the Node.js server.

The workflow is:
1. Node.js calls this script periodically (via setInterval in frontend)
2. Script reads ADC value
3. Script sets LED states based on thresholds
4. Script prints ADC value and status to stdout
5. Script exits (Node.js will call it again after interval)

Usage:
    python3 auto_blink.py [--threshold-low N] [--threshold-high N]
    
    --threshold-low:  ADC value below this = bright (default: 300)
    --threshold-high: ADC value above this = dark (default: 600)

Output (JSON format for easy parsing in Node.js):
    {"adc": 450, "level": "medium", "led1": true, "led2": false}

Light Level Behavior:
    - Bright (ADC < low threshold):  Both LEDs OFF
    - Medium (ADC between thresholds): LED1 ON, LED2 OFF  
    - Dark (ADC > high threshold): Both LEDs ON
    
Note: Higher ADC values = darker environment (photoresistor behavior)
"""

import sys
import json
import argparse
from gpio_utils import init_gpio, cleanup_gpio, read_adc, set_led, PHOTO_CHANNEL


# Default thresholds (can be overridden via command line)
DEFAULT_THRESHOLD_LOW = 300   # Below this = bright
DEFAULT_THRESHOLD_HIGH = 600  # Above this = dark


def determine_light_level(adc_value, threshold_low, threshold_high):
    """
    Determine the light level based on ADC reading.
    
    Args:
        adc_value: Raw ADC reading (0-1023)
        threshold_low: Lower threshold
        threshold_high: Upper threshold
    
    Returns:
        tuple: (level_name, led1_state, led2_state)
    """
    if adc_value < threshold_low:
        # Bright environment - no LEDs needed
        return ("bright", False, False)
    elif adc_value < threshold_high:
        # Medium light - one LED on as warning
        return ("medium", True, False)
    else:
        # Dark environment - both LEDs on
        return ("dark", True, True)


def main():
    """
    Read ADC, set LEDs, and output status as JSON.
    """
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Auto-control LEDs based on light level')
    parser.add_argument('--threshold-low', type=int, default=DEFAULT_THRESHOLD_LOW,
                        help=f'Low threshold (default: {DEFAULT_THRESHOLD_LOW})')
    parser.add_argument('--threshold-high', type=int, default=DEFAULT_THRESHOLD_HIGH,
                        help=f'High threshold (default: {DEFAULT_THRESHOLD_HIGH})')
    args = parser.parse_args()
    
    try:
        # Initialize GPIO
        init_gpio()
        
        # Read the photoresistor value
        adc_value = read_adc(PHOTO_CHANNEL)
        
        # Determine light level and LED states
        level, led1_state, led2_state = determine_light_level(
            adc_value, args.threshold_low, args.threshold_high
        )
        
        # Set the LEDs
        set_led(1, led1_state)
        set_led(2, led2_state)
        
        # Output result as JSON (easy to parse in Node.js)
        result = {
            "adc": adc_value,
            "level": level,
            "led1": led1_state,
            "led2": led2_state,
            "thresholds": {
                "low": args.threshold_low,
                "high": args.threshold_high
            }
        }
        
        # Print JSON to stdout
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        # Output error as JSON too
        error_result = {
            "error": str(e),
            "adc": -1,
            "level": "error",
            "led1": False,
            "led2": False
        }
        print(json.dumps(error_result))
        sys.exit(1)
        
    finally:
        # Don't cleanup - we want LEDs to maintain their state
        pass


if __name__ == '__main__':
    main()