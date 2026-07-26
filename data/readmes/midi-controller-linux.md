# Yamaha Custom USB MIDI Driver

This repository provides an open-source, custom Linux Kernel Module (LKM) designed to interface with Yamaha digital keyboards (such as the Yamaha PSR A2000) over USB. It bypasses the standard Linux `snd-usb-audio` driver to provide raw, real-time access to MIDI streams via a dedicated character device, making it perfect for custom hardware integrations, low-latency audio applications, or driver development learning.

It also includes a Python-based **Virtual Keyboard UI** to visualize MIDI input in real-time.

---

## 🌟 Key Features
- **Kernel Module (LKM):** Communicates directly with the USB interface via Linux `usb_driver`, intercepting MIDI byte streams from Bulk/Interrupt IN Endpoints.
- **Thread-Safe Buffering:** Utilizes `kfifo`, `spinlock`, and `wait_queue` primitives to ensure safe, concurrent data access between hardware interrupts and user-space applications.
- **Automated Device Binding:** Includes shell scripts to dynamically unbind Yamaha devices from the default Linux driver (`snd-usb-audio`) and bind them to our custom module.
- **Virtual Keyboard GUI:** A lightweight `tkinter` application that reads raw MIDI data from the character device and visualizes key presses instantly.

---

## ⚙️ System Requirements
- Linux OS (Ubuntu, Debian, or similar).
- Build tools: `make`, `gcc`, `build-essential`.
- Linux headers for your kernel version (`linux-headers-$(uname -r)`).
- Python 3 and the `tkinter` library.
- A Yamaha digital keyboard connected via a USB Type-B cable (USB TO HOST port).

---

## 🚀 Installation & Usage

### 1. Install Dependencies
Ensure you have the required GUI library for the Python application:
```bash
sudo apt update
sudo apt install -y python3-tk
```

### 2. Compile and Load the Kernel Module
Open a terminal in the root directory of this repository:
```bash
# Clean previous builds and compile the driver
make clean
make driver
sudo rmmod custom_midi
# Insert the kernel module into the Linux kernel
sudo insmod driver/custom_midi.ko

# Grant read permissions to the character device for user-space apps
sudo chmod 666 /dev/custom_midi
```

### 3. Handle Driver Conflicts (Important)
By default, the Linux kernel will automatically assign the `snd-usb-audio` driver to any connected Yamaha keyboard. In order for our `custom_usb_midi` driver to receive data, we must unbind the device from the native driver.

Run the provided setup script to automate this process:
```bash
./setup_device.sh
```
*Note: You may be prompted for your sudo password to change device bindings.*

### 4. Launch the Virtual Keyboard
Now that the driver is intercepting MIDI data, you can launch the visualization app:
```bash
cd app
python3 run.py
```
Play some notes on your physical Yamaha keyboard and watch the virtual keys respond in real-time!

---

## 🧹 Uninstallation

If you wish to stop using this custom driver and return your keyboard to normal functionality (e.g., to use it with standard DAWs like LMMS or Ableton), run the restore script. It will automatically return control to the native Linux driver and unload our custom module:

```bash
./restore_device.sh
```

---

## 🛠️ Troubleshooting

**1. The GUI says "Waiting for MIDI input..." but keys don't light up:**
- Ensure the keyboard is powered on and connected to the **USB TO HOST** port, not the "USB TO DEVICE" port.
- Verify that you have granted read permissions: `sudo chmod 666 /dev/custom_midi`.
- If you unplugged and re-plugged the USB cable, Linux will reassign the device to `snd-usb-audio`. You must run `./setup_device.sh` again.

**2. The setup script outputs "No such device" on one of the interfaces (e.g., `1-4:1.0`):**
- This is completely normal and expected. Yamaha keyboards expose multiple USB interfaces. The first interface (`1.0`) is usually the Audio Control interface (which lacks MIDI data endpoints), so our driver intentionally rejects it. It will successfully bind to the MIDI Streaming interface (e.g., `1.1`).

**3. "externally-managed-environment" error when using `pip`:**
- Do not use `pip` to install tkinter. Modern Linux distributions enforce system package managers for Python GUI libraries. Follow Step 1 and use `apt`.

---
*Contributions and pull requests are welcome!*
