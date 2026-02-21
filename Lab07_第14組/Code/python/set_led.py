#!/usr/bin/env python3
"""
set_led.py - Manually control LED state

This script sets a specific LED to ON or OFF state. It's designed to be
called by Node.js for the manual control mode (NO_DETECT).

Usage:
    python3 set_led.py <led_number> <state>
    
    led_number: 1 or 2
    state: "on" or "off"

Examples:
    python3 set_led.py 1 on    # Turn LED 1 on
    python3 set_led.py 2 off   # Turn LED 2 off
    python3 set_led.py 1 on 2 on   # Turn both LEDs on

Output:
    Prints confirmation message to stdout

Exit codes:
    0 = Success
    1 = Error (invalid arguments)
"""

import sys
from gpio_utils import init_gpio, cleanup_gpio, set_led


def print_usage():
    """Print usage instructions."""
    print("Usage: python3 set_led.py <led_number> <state> [<led_number> <state> ...]")
    print("  led_number: 1 or 2")
    print("  state: 'on' or 'off'")
    print("")
    print("Examples:")
    print("  python3 set_led.py 1 on        # Turn LED 1 on")
    print("  python3 set_led.py 2 off       # Turn LED 2 off")
    print("  python3 set_led.py 1 on 2 on   # Turn both LEDs on")


def main():
    """
    Parse arguments and set LED states.
    """
    args = sys.argv[1:]  # Remove script name
    
    # Check for minimum arguments
    if len(args) < 2:
        print("Error: Not enough arguments", file=sys.stderr)
        print_usage()
        sys.exit(1)
    
    # Arguments should come in pairs: led_number, state
    if len(args) % 2 != 0:
        print("Error: Arguments must be in pairs (led_number state)", file=sys.stderr)
        print_usage()
        sys.exit(1)
    
    # Parse LED commands
    commands = []
    for i in range(0, len(args), 2):
        try:
            led_num = int(args[i])
            state = args[i + 1].lower()
            
            # Validate LED number
            if led_num not in [1, 2]:
                print(f"Error: Invalid LED number '{led_num}'. Must be 1 or 2.", file=sys.stderr)
                sys.exit(1)
            
            # Validate state
            if state not in ['on', 'off']:
                print(f"Error: Invalid state '{state}'. Must be 'on' or 'off'.", file=sys.stderr)
                sys.exit(1)
            
            commands.append((led_num, state == 'on'))
            
        except ValueError:
            print(f"Error: LED number must be an integer, got '{args[i]}'", file=sys.stderr)
            sys.exit(1)
    
    try:
        # Initialize GPIO
        init_gpio()
        
        # Execute all LED commands
        results = []
        for led_num, state in commands:
            set_led(led_num, state)
            state_str = "ON" if state else "OFF"
            results.append(f"LED{led_num}:{state_str}")
        
        # Print confirmation (Node.js will capture this)
        print(",".join(results))
        sys.exit(0)
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
        
    finally:
        # Note: We don't cleanup GPIO here because we want LEDs to stay in their set state
        # The cleanup would turn them off
        pass


if __name__ == '__main__':
    main()