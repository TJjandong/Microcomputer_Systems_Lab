#include "string"
#include "gpio_LED_CTRL.hpp"
#include "PIN_LOOKUP.hpp"
#include <stdio.h>
#include <memory>
#include <unistd.h>

void blink(std::shared_ptr<gpio::LED_CTRL>, std::shared_ptr<gpio::LED_CTRL>, std::shared_ptr<gpio::LED_CTRL>, std::shared_ptr<gpio::LED_CTRL>, int, int);

int main(int argc, char* argv[]) {
	if (argc < 3) perror("insufficient parameters.");
	std::shared_ptr<gpio::LED_CTRL> LED1 = std::make_shared<gpio::LED_CTRL>(LOOKUP::PIN::P7 );
	std::shared_ptr<gpio::LED_CTRL> LED2 = std::make_shared<gpio::LED_CTRL>(LOOKUP::PIN::P13);
	std::shared_ptr<gpio::LED_CTRL> LED3 = std::make_shared<gpio::LED_CTRL>(LOOKUP::PIN::P15);
	std::shared_ptr<gpio::LED_CTRL> LED4 = std::make_shared<gpio::LED_CTRL>(LOOKUP::PIN::P32);
	
	std::string arg1 = std::string(argv[1]);
	std::string arg2 = std::string(argv[2]);
	
	if (arg1 == "LED1") {
		if (arg2 == "on") LED1->enable();
		else LED1->disable();
	}
	else if (arg1 == "LED2") {
		if (arg2 == "on") LED2->enable();
		else LED2->disable();
	}
	else if (arg1 == "LED3") {
		if (arg2 == "on") LED3->enable();
		else LED3->disable();
	}
	else if (arg1 == "LED4") {
		if (arg2 == "on") LED4->enable();
		else LED4->disable();
	}
	else if (arg1 == "blink") {
		blink(LED1, LED2, LED3, LED4, std::stoi(argv[2]), std::stoi(argv[3]));
	}

	return 0;
}

void blink(std::shared_ptr<gpio::LED_CTRL> LED1, std::shared_ptr<gpio::LED_CTRL> LED2, std::shared_ptr<gpio::LED_CTRL> LED3, std::shared_ptr<gpio::LED_CTRL> LED4, int count, int interval) {
	double time_sleep = interval * 0.001;
	LED1->enable();
	LED2->enable();
	for (int i=0; i<count; ++i) {
		sleep(time_sleep);
		LED1->disable();
		LED2->disable();
		LED3->enable();
		LED4->enable();
		sleep(time_sleep);
		LED1->enable();
		LED2->enable();
		LED3->disable();
		LED4->disable();
	}
	sleep(time_sleep);
	LED1->disable();
	LED2->disable();
}
