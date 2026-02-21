#!/usr/bin/env python3
"""
read_adc.py - Read the photoresistor value from ADC

This script reads a single value from the photoresistor connected to the
MCP3008 ADC and prints it to stdout. It's designed to be called by Node.js
using child_process.spawn() or child_process.execFile().

Usage:
    python3 read_adc.py

Output:
    Prints a single integer (0-1023) to stdout
    - Higher values = darker environment
    - Lower values = brighter environment

Exit codes:
    0 = Success
    1 = Error
"""

import sys

# Import our GPIO utilities module
from gpio_utils import init_gpio, cleanup_gpio, read_adc, PHOTO_CHANNEL


def main():
    """
    Read and print a single ADC value.
    """
    try:
        # Initialize GPIO
        init_gpio()
        
        # Read the photoresistor value
        value = read_adc(PHOTO_CHANNEL)
        
        # Print the value (Node.js will capture this via stdout)
        print(value)
        
        # Exit with success code
        sys.exit(0)
        
    except Exception as e:
        # Print error to stderr (won't interfere with stdout data)
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
        
    finally:
        # Always clean up GPIO
        cleanup_gpio()


if __name__ == '__main__':
    main()