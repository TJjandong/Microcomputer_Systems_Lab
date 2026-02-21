#include <linux/kernel.h>
#include <linux/module.h>

static int __init tx2_hello_module_init(void) {
	printk("hello tx2 module is installed\n");
	return 0;
}

static void __exit tx2_hello_module_cleaup(void) {
	printk("bye tx2 module is removed\n");
}

module_init(tx2_hello_module_init);
module_exit(tx2_hello_module_cleaup);
MODULE_LICENSE("GPL");


