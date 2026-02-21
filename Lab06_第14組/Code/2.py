import Jetson.GPIO as GPIO
import time

# change these as desired - they're the pins connected from the SPI port on the ADC to the Cobbler
SPICLK = 11
SPIMISO = 9
SPIMOSI = 10
SPICS = 8
LED1_PIN = 7     
LED2_PIN = 12    

# photoresistor connected to adc #0
photo_ch = 0

# Thresholds for light levels
WEAK_THRESHOLD = 300   
STRONG_THRESHOLD = 600 

# port init
def init():
	# GPIO.BOARD    GPIO.BCM    GPIO.CVM    GPIO.TEGRA_SOC
		GPIO.setmode(GPIO.BCM) 		#to specify which pin numbering system
    	GPIO.setwarnings(False)

    	# set up the SPI interface pins
    	GPIO.setup(SPIMOSI, GPIO.OUT)
    	GPIO.setup(SPIMISO, GPIO.IN)
    	GPIO.setup(SPICLK, GPIO.OUT)
    	GPIO.setup(SPICS, GPIO.OUT)


    	GPIO.setup(LED1_PIN, GPIO.OUT, initial = GPIO.LOW)
    	GPIO.setup(LED2_PIN, GPIO.OUT, initial = GPIO.LOW)

# read SPI data from MCP3000(or MCP3204) chip.8 possible adc's (0 thru 7)
def readadc(adcnum, clockpin, mosipin, misopin, cspin):
	if ((adcnum > 7) or (adcnum < 0)):
		return -1
	GPIO.output(cspin, True)

	GPIO.output(clockpin, False)	# start clock low
	GPIO.output(cspin, False)	# bring CS low

	commandout = adcnum
	commandout |= 0x18	# start bit + single-ended bit
	commandout <<= 3	# we only need to send 5 bits here
	for i in range(5):
		if (commandout & 0x80):
			GPIO.output(mosipin, True)
		else:
			GPIO.output(mosipin, False)
		commandout <<= 1
		GPIO.output(clockpin, True)
		GPIO.output(clockpin, False)
	adcout = 0

	# read in one empty bit, one null bit and 10 ADC bits
	for i in range(12):
		GPIO.output(clockpin, True)
		GPIO.output(clockpin, False)
		adcout <<= 1
		if (GPIO.input(misopin)):
			adcout |= 0x1

	GPIO.output(cspin, True)


	adcout >>= 1		# first bit is 'null' so drop it
	return adcout

def main():
	init()
	while True:

		adc_value = readadc(photo_ch, SPICLK, SPIMOSI, SPIMISO, SPICS)
		
		print(f"ADC Value: {adc_value}")

		GPIO.output(LED1_PIN, GPIO.LOW)
		GPIO.output(LED2_PIN, GPIO.LOW)
		
		if adc_value >= STRONG_THRESHOLD:

			GPIO.output(LED1_PIN, GPIO.HIGH) 
			GPIO.output(LED2_PIN, GPIO.HIGH) 
			print(" -> LED 1 & LED 2 (Very Dark) ON")
			
		elif adc_value >= WEAK_THRESHOLD:

			GPIO.output(LED1_PIN, GPIO.HIGH) 
			print(" -> LED 1 (Slightly Dark) ON")
			
		else:

			print(" -> All LEDs OFF")
        
		time.sleep(1)

if __name__ == '__main__':
	try:
		main()
	except KeyboardInterrupt:

		pass
	finally:

		GPIO.cleanup()
