#!/usr/bin/env python3
"""
leds_off.py - Turn off all LEDs and cleanup GPIO

This script is designed to be called when:
1. Switching from DETECT to NO_DETECT mode (reset LEDs)
2. Stopping the application
3. Any cleanup scenario

Usage:
    python3 leds_off.py

Output:
    Prints confirmation message to stdout
"""

import sys
from gpio_utils import init_gpio, cleanup_gpio, set_all_leds


def main():
    """
    Turn off all LEDs and cleanup.
    """
    try:
        # Initialize GPIO
        init_gpio()
        
        # Turn off all LEDs
        set_all_leds(False)
        
        # Print confirmation
        print("All LEDs turned off")
        sys.exit(0)
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
        
    finally:
        # Cleanup GPIO
        cleanup_gpio()


if __name__ == '__main__':
    main()