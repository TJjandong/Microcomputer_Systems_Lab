obj-m := demo.o

kernel_DIR := /usr/src/linux-headers-5.4.0-150-generic/

PWD := $(shell pwd)
all: 
	make -C $(kernel_DIR) M=$(PWD)
clean: 
	rm -f *.ko *.mod.c *.o
.PHONY: 
	clean
