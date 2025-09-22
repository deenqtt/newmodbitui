import os
import sys
import time
import subprocess
import logging
import numpy as np
from pathlib import Path

class ThermalInterface:
    def __init__(self, config):
        self.config = config
        self.interface = None
        self.sensor = None
        self.senxor_path = config['thermal']['senxor_path']
        self.logger = logging.getLogger('thermal_interface')
        
        # Add senxor path to Python path
        if self.senxor_path and os.path.exists(self.senxor_path):
            sys.path.insert(0, self.senxor_path)
        
        # Initialize streaming flags
        self.usb_streaming = False
        self.spi_streaming = False
        
    def initialize(self):
        """Initialize thermal sensor with auto-detection"""
        if self.config['thermal']['auto_detect']:
            return self.auto_detect_interface()
        else:
            # Use specified interface
            interface = self.config['thermal']['interface']
            if interface == 'spi':
                return self._init_spi()
            elif interface == 'usb':
                return self._init_usb()
            else:
                self.logger.error(f"Unknown interface: {interface}")
                return False
    
    def auto_detect_interface(self):
        """Auto detect and initialize available thermal interface"""
        self.logger.info("Starting auto-detection of thermal interface...")
        
        # Priority 1: Try USB (lebih mudah untuk testing)
        if self._check_usb_available():
            self.logger.info("USB interface available, attempting initialization...")
            if self._init_usb():
                self.logger.info("✅ USB interface successfully initialized")
                return True
            else:
                self.logger.warning("❌ USB initialization failed")
        
        # Priority 2: Try SPI fallback
        if self._check_spi_available():
            self.logger.info("SPI interface available, attempting initialization...")
            if self._init_spi():
                self.logger.info("✅ SPI interface successfully initialized")
                return True
            else:
                self.logger.warning("❌ SPI initialization failed")
        
        self.logger.error("❌ No thermal interface could be initialized")
        return False
    
    def _check_spi_available(self):
        """Check if SPI device is available"""
        try:
            # Check if SPI device exists
            spi_device = self.config['thermal']['spi_device']
            spi_available = os.path.exists(spi_device)
            
            if not spi_available:
                self.logger.debug(f"SPI device {spi_device} not found")
                return False
                
            # Check if required GPIO libraries are available
            try:
                from gpiozero import Pin, DigitalInputDevice, DigitalOutputDevice
                from smbus import SMBus
                from spidev import SpiDev
                self.logger.info(f"SPI device {spi_device} available and GPIO libraries imported")
                return True
            except ImportError as e:
                self.logger.warning(f"SPI device exists but GPIO libraries not available: {e}")
                return False
                        
        except Exception as e:
            self.logger.error(f"Error checking SPI availability: {e}")
            return False
    
    def _check_usb_available(self):
        """Check if USB thermal device is available"""
        try:
            # Check for connected USB devices
            result = subprocess.run(['lsusb'], capture_output=True, text=True)
            usb_output = result.stdout.lower()
            
            # Look for thermal camera identifiers
            thermal_identifiers = ['0416:', 'b002', 'b020', 'winbond', 'thermal', 'senxor']
            
            for identifier in thermal_identifiers:
                if identifier in usb_output:
                    self.logger.info(f"USB thermal device detected: {identifier}")
                    return True
            
            # Also check for USB serial devices
            usb_devices = ['/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyACM0', '/dev/ttyACM1']
            for device in usb_devices:
                if os.path.exists(device):
                    self.logger.info(f"USB device found: {device}")
                    return True
                    
            self.logger.debug("No USB thermal devices detected")
            return False
            
        except Exception as e:
            self.logger.error(f"Error checking USB availability: {e}")
            return False
    
    def _init_spi(self):
        """Initialize SPI thermal sensor"""
        try:
            self.logger.info("Initializing SPI interface...")
            
            # Import senxor library for SPI
            from senxor.mi48 import MI48
            from senxor.interfaces import SPI_Interface, I2C_Interface
            
            # Import GPIO libraries
            from gpiozero import DigitalInputDevice, DigitalOutputDevice
            from smbus import SMBus
            from spidev import SpiDev
            
            # SPI configuration
            RPI_GPIO_I2C_CHANNEL = 1
            RPI_GPIO_SPI_BUS = 0
            RPI_GPIO_SPI_CE_MI48 = 0
            MI48_I2C_ADDRESS = 0x40
            SPI_XFER_SIZE_BYTES = 160
            
            # Create I2C interface
            i2c_bus = SMBus(RPI_GPIO_I2C_CHANNEL)
            i2c = I2C_Interface(i2c_bus, MI48_I2C_ADDRESS)
            
            # Create SPI interface
            spi_dev = SpiDev(RPI_GPIO_SPI_BUS, RPI_GPIO_SPI_CE_MI48)
            spi = SPI_Interface(spi_dev, xfer_size=SPI_XFER_SIZE_BYTES)
            
            # Configure SPI device
            spi.device.mode = 0b00
            spi.device.max_speed_hz = 31200000
            spi.device.bits_per_word = 8
            spi.device.lsbfirst = False
            
            # Setup GPIO pins
            self.mi48_spi_cs_n = DigitalOutputDevice("BCM7", active_high=False, initial_value=False)
            self.mi48_data_ready = DigitalInputDevice("BCM24", pull_up=False)
            self.mi48_reset_n = DigitalOutputDevice("BCM23", active_high=False, initial_value=True)
            
            # Create reset handler
            reset_handler = self._create_reset_handler()
            
            # Create MI48 instance
            self.sensor = MI48([i2c, spi], 
                             data_ready=self.mi48_data_ready,
                             reset_handler=reset_handler)
            
            # Store interfaces for cleanup
            self.spi_interface = spi
            self.i2c_interface = i2c
            
            # Set interface type
            self.interface = "spi"
            
            # Get camera info to verify connection
            camera_info = self.sensor.get_camera_info()
            self.logger.info(f"SPI Camera Info: {camera_info}")
            
            # Configure sensor
            self.sensor.set_fps(7)  # Lower FPS for SPI
            self.sensor.disable_filter(f1=True, f2=True, f3=True)
            self.sensor.set_offset_corr(0.0)
            
            # Start streaming
            self.sensor.start(stream=True, with_header=True)
            self.spi_streaming = True
            
            self.logger.info("SPI interface initialized successfully")
            return True
            
        except ImportError as e:
            self.logger.error(f"Required libraries not available for SPI: {e}")
            return False
        except Exception as e:
            self.logger.error(f"SPI initialization failed: {e}")
            self._cleanup_spi()
            return False
    
    def _init_usb(self):
        """Initialize USB thermal sensor"""
        try:
            self.logger.info("Initializing USB interface...")
            
            # Import senxor library
            from senxor.mi48 import MI48
            from senxor.utils import connect_senxor
            
            # Try using the helper function first
            try:
                mi48, connected_port, port_names = connect_senxor()
                if mi48 is None:
                    raise Exception("connect_senxor returned None")
                
                self.sensor = mi48
                self.interface = "usb"
                
                # Get camera info to verify connection
                camera_info = self.sensor.get_camera_info()
                self.logger.info(f"USB Camera Info: {camera_info}")
                
                # Configure sensor
                self.sensor.set_fps(15)
                self.sensor.disable_filter(f1=True, f2=True, f3=True)
                self.sensor.set_offset_corr(0.0)
                
                self.logger.info(f"USB interface initialized via port: {connected_port}")
                return True
                
            except Exception as e:
                self.logger.warning(f"connect_senxor failed: {e}, trying manual USB setup...")
                
                # Manual USB setup sebagai fallback
                import serial
                from senxor.interfaces import get_serial, USB_Interface
                
                # Find and open USB device
                ser = get_serial()
                if ser is None:
                    raise Exception("No USB serial device found")
                
                # Create USB interface
                usb_interface = USB_Interface(ser)
                
                # Create MI48 instance
                self.sensor = MI48([usb_interface, usb_interface])
                self.interface = "usb"
                
                # Get camera info to verify connection
                camera_info = self.sensor.get_camera_info()
                self.logger.info(f"USB Camera Info (manual): {camera_info}")
                
                # Configure sensor
                self.sensor.set_fps(15)
                self.sensor.disable_filter(f1=True, f2=True, f3=True)
                self.sensor.set_offset_corr(0.0)
                
                self.logger.info("USB interface initialized successfully (manual)")
                return True
            
        except ImportError as e:
            self.logger.error(f"senxor library import failed: {e}")
            return False
        except Exception as e:
            self.logger.error(f"USB initialization failed: {e}")
            self._cleanup_usb()
            return False
    
    def _create_reset_handler(self):
        """Create reset handler for SPI interface"""
        class MI48_reset:
            def __init__(self, pin, assert_seconds=0.000035, deassert_seconds=0.050):
                self.pin = pin
                self.assert_time = assert_seconds
                self.deassert_time = deassert_seconds

            def __call__(self):
                print('Resetting the MI48...')
                self.pin.on()
                time.sleep(self.assert_time)
                self.pin.off()
                time.sleep(self.deassert_time)
                print('Done.')
        
        return MI48_reset(pin=self.mi48_reset_n)
    
    def capture_frame(self):
        """Capture thermal frame data"""
        try:
            if not self.sensor:
                raise Exception("Sensor not initialized")
            
            if self.interface == "spi":
                return self._capture_spi_frame()
            elif self.interface == "usb":
                return self._capture_usb_frame()
            else:
                raise Exception(f"Unknown interface: {self.interface}")
                
        except Exception as e:
            self.logger.error(f"Frame capture failed: {e}")
            return None
    
    def _capture_spi_frame(self):
        """Capture frame via SPI"""
        try:
            # Wait for data ready pin
            from senxor.mi48 import DATA_READY
            
            if hasattr(self.sensor, 'data_ready') and self.sensor.data_ready:
                # Wait for data ready pin with timeout
                timeout_start = time.time()
                timeout_duration = 2.0  # 2 seconds timeout
                
                while not self.sensor.data_ready.is_active:
                    if time.time() - timeout_start > timeout_duration:
                        raise Exception("SPI data ready pin timeout")
                    time.sleep(0.001)  # 1ms sleep
            else:
                # Poll for DATA_READY status
                data_ready = False
                timeout = 2.0
                start_time = time.time()
                while not data_ready and (time.time() - start_time) < timeout:
                    time.sleep(0.01)
                    status = self.sensor.get_status()
                    data_ready = status & DATA_READY
                
                if not data_ready:
                    raise Exception("SPI data ready status timeout")
            
            # Assert CS, read frame, then deassert CS
            if hasattr(self, 'mi48_spi_cs_n'):
                self.mi48_spi_cs_n.on()
                time.sleep(0.0001)  # CS delay
            
            data, header = self.sensor.read()
            
            if hasattr(self, 'mi48_spi_cs_n'):
                time.sleep(0.0001)  # CS delay
                self.mi48_spi_cs_n.off()
            
            if data is None:
                raise Exception("Failed to read SPI frame")
            
            return data
            
        except Exception as e:
            self.logger.error(f"SPI frame capture error: {e}")
            return None
    
    def _capture_usb_frame(self):
        """Capture frame via USB"""
        try:
            # Start streaming if not already started
            if not self.usb_streaming:
                self.logger.info("Starting USB streaming...")
                self.sensor.start(stream=True, with_header=True)
                self.usb_streaming = True
                time.sleep(0.5)  # Give more time for streaming to start
            
            # Read frame from USB
            data, header = self.sensor.read()
            if data is None:
                raise Exception("Failed to read USB frame - got None")
            
            # Log header info if available
            if header is not None:
                self.logger.debug(f"Frame counter: {header.get('frame_counter', 'N/A')}, "
                                f"Timestamp: {header.get('timestamp', 'N/A')}")
            
            return data
            
        except Exception as e:
            self.logger.error(f"USB frame capture error: {e}")
            return None
    
    def get_thermal_stats(self, frame_data):
        """Calculate thermal statistics from frame data"""
        try:
            if frame_data is None:
                return None
            
            # Convert to numpy array
            thermal_array = np.array(frame_data, dtype=float)
            
            # Calculate statistics
            stats = {
                'min_temp': float(np.min(thermal_array)),
                'max_temp': float(np.max(thermal_array)),
                'avg_temp': float(np.mean(thermal_array)),
                'median_temp': float(np.median(thermal_array)),
                'std_temp': float(np.std(thermal_array)),
                'shape': thermal_array.shape if hasattr(thermal_array, 'shape') else None,
                'total_pixels': thermal_array.size if hasattr(thermal_array, 'size') else len(thermal_array)
            }
            
            return stats
            
        except Exception as e:
            self.logger.error(f"Error calculating thermal stats: {e}")
            return None
    
    def _cleanup_spi(self):
        """Clean up SPI resources"""
        try:
            if hasattr(self, 'mi48_spi_cs_n'):
                self.mi48_spi_cs_n.close()
            if hasattr(self, 'mi48_data_ready'):
                self.mi48_data_ready.close()
            if hasattr(self, 'mi48_reset_n'):
                self.mi48_reset_n.close()
            if hasattr(self, 'spi_interface'):
                self.spi_interface.close()
            if hasattr(self, 'i2c_interface'):
                self.i2c_interface.close()
        except Exception as e:
            self.logger.error(f"Error cleaning up SPI: {e}")
    
    def _cleanup_usb(self):
        """Clean up USB resources"""
        try:
            if self.sensor and hasattr(self.sensor, 'interfaces'):
                for interface in self.sensor.interfaces:
                    if hasattr(interface, 'close'):
                        interface.close()
        except Exception as e:
            self.logger.error(f"Error cleaning up USB: {e}")
    
    def close(self):
        """Close thermal sensor connection"""
        try:
            if self.sensor:
                # Stop streaming
                if self.usb_streaming:
                    self.sensor.stop()
                    self.usb_streaming = False
                    self.logger.info("USB streaming stopped")
                
                if self.spi_streaming:
                    self.sensor.stop(stop_timeout=1.0)
                    self.spi_streaming = False
                    self.logger.info("SPI streaming stopped")
                
                # Clean up interfaces
                if self.interface == "spi":
                    self._cleanup_spi()
                elif self.interface == "usb":
                    self._cleanup_usb()
                
                self.sensor = None
                self.logger.info(f"Thermal sensor ({self.interface}) closed")
                
        except Exception as e:
            self.logger.error(f"Error closing sensor: {e}")
    
    def restart_sensor(self):
        """Restart thermal sensor (useful for error recovery)"""
        self.logger.info("Restarting thermal sensor...")
        self.close()
        time.sleep(2)  # Wait for cleanup
        return self.initialize()