#include <linux/init.h>
#include <linux/kernel.h>
#include <linux/module.h>
#include <linux/fs.h>
#include <asm/uaccess.h>

#define CDEV_NOT_USED 0
#define CDEV_EXCLUSIVE_OPEN 1
#define MAJOR_NUM 60
#define MODULE_NAME "demo"
#define SUCCESS 0
#define IOCTL_GET_MSG 1
#define DEVICE_NAME "demo"


static int device_opened = 0;
static char message[100];
static char *message_ptr;
static atomic_t already_open = ATOMIC_INIT(0);

static int iCount = 0;
static char userChar[100];

static void __exit demo_exit(void)
{
    unregister_chrdev(MAJOR_NUM, "demo");
    printk("<1>%s: removed\n", MODULE_NAME);
}

static ssize_t drv_read(struct file *file, char *buf, size_t count, loff_t *ppos)
{
    printk("device read\n");
    return count;
}

static ssize_t drv_write(struct file *file, const char *buf, size_t count, loff_t *ppos)
{
    printk("device write\n");
    printk("%d\n", iCount);
    printk("W_buf_size: %d\n", (int)count);
    raw_copy_from_user(userChar, buf, count);
    userChar[count - 1] = 0;
    printk("userChar: %s\n", userChar);
    printk("userChar: %d\n", (int)sizeof(userChar));
    iCount++;
    return iCount;
}

static long drv_ioctl(struct file *file, unsigned int ioctl_num, unsigned long ioctl_param)
{
    int i;
    long ret = SUCCESS;

    if (atomic_cmpxchg(&already_open, CDEV_NOT_USED, CDEV_EXCLUSIVE_OPEN))
        return -EBUSY;
    switch (ioctl_num)
    {
    case IOCTL_GET_MSG:
    {
        loff_t offset = 0;
        i = drv_read(file, (char __user *)ioctl_param, 99, &offset);
        put_user('\0', (char __user *)ioctl_param + i);
        break;
    }
    default:
        break;
    }
    atomic_set(&already_open, CDEV_NOT_USED);
    return ret;
}

static int drv_open(struct inode *inode, struct file *file)
{
    static int counter = 0;
    if (device_opened) return -EBUSY;
    device_opened++;
    sprintf(message, "The file %s has been opened %d times.\n", DEVICE_NAME, ++counter);
    message_ptr = message;
    try_module_get(THIS_MODULE);
    return SUCCESS;
}

static int drv_release(struct inode *inode, struct file *file)
{
    device_opened--;
    module_put(THIS_MODULE);
    return SUCCESS;
}

struct file_operations drv_fops =
{
    read: drv_read,
    write: drv_write,
    unlocked_ioctl: drv_ioctl,
    open: drv_open,
    release: drv_release,
};

static int __init demo_init(void)
{
    if (register_chrdev(MAJOR_NUM, "demo", &drv_fops) < 0)
    {
        printk("<1>%s: can't get major %d\n", MODULE_NAME, MAJOR_NUM);
        return (-EBUSY);
    }

    printk("<1>%s: started\n", MODULE_NAME);
    return 0;
}

module_init(demo_init);
module_exit(demo_exit);
MODULE_LICENSE("GPL");
