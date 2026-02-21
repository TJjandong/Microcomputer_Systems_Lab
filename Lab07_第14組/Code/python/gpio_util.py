"""
gpio_utils.py - Shared utilities for GPIO and ADC operations
Lab 7: Photoresistor ADC Monitoring

This module provides common functions for:
- GPIO initialization
- SPI communication with MCP3008 ADC
- LED control

Pin Configuration (BCM numbering):
- SPICLK  = 11 (SPI Clock)
- SPIMISO = 9  (SPI Master In, Slave Out)
- SPIMOSI = 10 (SPI Master Out, Slave In)
- SPICS   = 8  (SPI Chip Select)
- LED1    = 7  (First LED)
- LED2    = 12 (Second LED)
"""

import Jetson.GPIO as GPIO
import time

# =============================================================================
# PIN DEFINITIONS (BCM numbering)
# =============================================================================

# SPI pins for MCP3008 ADC communication
SPICLK = 11    # Clock signal
SPIMISO = 9    # Data from ADC to Jetson (Master In, Slave Out)
SPIMOSI = 10   # Data from Jetson to ADC (Master Out, Slave In)
SPICS = 8      # Chip Select (active low)

# LED pins
LED1_PIN = 7   # First LED
LED2_PIN = 12  # Second LED

# ADC channel for photoresistor
PHOTO_CHANNEL = 0  # Photoresistor connected to CH0 of MCP3008

# =============================================================================
# INITIALIZATION
# =============================================================================

def init_gpio():
    """
    Initialize GPIO pins for SPI communication and LED control.
    Must be called before using any other functions in this module.
    """
    # Use BCM pin numbering (matches the pin numbers we defined above)
    GPIO.setmode(GPIO.BCM)
    
    # Suppress warnings about pins being already in use
    GPIO.setwarnings(False)
    
    # Set up SPI interface pins
    GPIO.setup(SPIMOSI, GPIO.OUT)  # Data out to ADC
    GPIO.setup(SPIMISO, GPIO.IN)   # Data in from ADC
    GPIO.setup(SPICLK, GPIO.OUT)   # Clock signal
    GPIO.setup(SPICS, GPIO.OUT)    # Chip select
    
    # Set up LED pins (start with LEDs off)
    GPIO.setup(LED1_PIN, GPIO.OUT, initial=GPIO.LOW)
    GPIO.setup(LED2_PIN, GPIO.OUT, initial=GPIO.LOW)


def cleanup_gpio():
    """
    Clean up GPIO pins. Call this when your program exits.
    """
    GPIO.cleanup()


# =============================================================================
# ADC READING (MCP3008)
# =============================================================================

def read_adc(channel):
    """
    Read a value from the MCP3008 ADC.
    
    The MCP3008 is a 10-bit ADC, so it returns values from 0 to 1023.
    - Higher values = darker (more resistance from photoresistor)
    - Lower values = brighter (less resistance from photoresistor)
    
    Args:
        channel: ADC channel to read (0-7 for MCP3008)
    
    Returns:
        int: ADC value (0-1023), or -1 if invalid channel
    """
    # Validate channel number
    if channel < 0 or channel > 7:
        return -1
    
    # Start with chip select HIGH (inactive)
    GPIO.output(SPICS, True)
    
    # Prepare clock and bring chip select LOW (active)
    GPIO.output(SPICLK, False)  # Clock starts low
    GPIO.output(SPICS, False)   # Activate the ADC
    
    # Build the command byte
    # Format: 0 0 0 1 1 X X X (where XXX is the channel number)
    # The 0x18 sets the start bit and single-ended mode bit
    command = channel
    command |= 0x18      # Add start bit (0x10) and single-ended bit (0x08)
    command <<= 3        # Shift left 3 bits (we only send 5 bits)
    
    # Send 5 bits of command to ADC
    for i in range(5):
        # Send one bit (MSB first)
        if command & 0x80:  # Check if highest bit is 1
            GPIO.output(SPIMOSI, True)
        else:
            GPIO.output(SPIMOSI, False)
        
        command <<= 1  # Shift to next bit
        
        # Pulse the clock
        GPIO.output(SPICLK, True)
        GPIO.output(SPICLK, False)
    
    # Read 12 bits from ADC (1 null bit + 10 data bits + 1 extra)
    adc_value = 0
    for i in range(12):
        # Pulse clock
        GPIO.output(SPICLK, True)
        GPIO.output(SPICLK, False)
        
        # Shift result and read bit
        adc_value <<= 1
        if GPIO.input(SPIMISO):
            adc_value |= 0x1
    
    # Deactivate chip select
    GPIO.output(SPICS, True)
    
    # Remove the first null bit
    adc_value >>= 1
    
    return adc_value


# =============================================================================
# LED CONTROL
# =============================================================================

def set_led(led_num, state):
    """
    Set an LED on or off.
    
    Args:
        led_num: Which LED (1 or 2)
        state: True/1/"on" for ON, False/0/"off" for OFF
    """
    # Determine which pin to control
    if led_num == 1:
        pin = LED1_PIN
    elif led_num == 2:
        pin = LED2_PIN
    else:
        print(f"Invalid LED number: {led_num}")
        return
    
    # Convert string state to boolean if needed
    if isinstance(state, str):
        state = state.lower() in ['on', 'true', '1', 'yes']
    
    # Set the LED state
    GPIO.output(pin, GPIO.HIGH if state else GPIO.LOW)


def set_all_leds(state):
    """
    Set all LEDs to the same state.
    
    Args:
        state: True for ON, False for OFF
    """
    set_led(1, state)
    set_led(2, state)


def blink_led(led_num, duration=0.5):
    """
    Blink a specific LED once.
    
    Args:
        led_num: Which LED (1 or 2)
        duration: How long to keep LED on (seconds)
    """
    set_led(led_num, True)
    time.sleep(duration)
    set_led(led_num, False)


def blink_all_leds(duration=0.5):
    """
    Blink all LEDs once.
    
    Args:
        duration: How long to keep LEDs on (seconds)
    """
    set_all_leds(True)
    time.sleep(duration)
    set_all_leds(False)


# =============================================================================
# TESTING
# =============================================================================

if __name__ == '__main__':
    """
    Test the GPIO utilities when this file is run directly.
    """
    try:
        print("Initializing GPIO...")
        init_gpio()
        
        print("Testing ADC read...")
        for i in range(5):
            value = read_adc(PHOTO_CHANNEL)
            print(f"  ADC Value: {value}")
            time.sleep(0.5)
        
        print("Testing LED 1...")
        blink_led(1, 0.5)
        
        print("Testing LED 2...")
        blink_led(2, 0.5)
        
        print("Testing both LEDs...")
        blink_all_leds(0.5)
        
        print("All tests complete!")
        
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
    finally:
        cleanup_gpio()
        print("GPIO cleaned up")