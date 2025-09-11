import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import threading
import time
from datetime import datetime
import json
import os
import sys

class ModemGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("EC25 LTE/GSM/GPS Modem Manager")
        self.root.geometry("800x600")
        
        # Initialize modem
        self.modem = None
        self.connected = False
        self.auto_refresh = tk.BooleanVar()
        self.refresh_thread = None
        self.config_file = "ec25_config.json"
        
        self.create_widgets()
        self.setup_layout()
        
        # Load configuration AFTER widgets are created
        self.load_config()
        
        # Auto-connect on startup
        self.root.after(1000, self.connect_modem)
    
    def create_widgets(self):
        # Main notebook for tabs
        self.notebook = ttk.Notebook(self.root)
        
        # Connection Tab
        self.connection_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.connection_frame, text="Connection")
        
        # GSM Tab
        self.gsm_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.gsm_frame, text="GSM/LTE")
        
        # GPS Tab
        self.gps_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.gps_frame, text="GPS")
        
        # Settings Tab
        self.settings_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.settings_frame, text="Settings")
        
        self.create_connection_tab()
        self.create_gsm_tab()
        self.create_gps_tab()
        self.create_settings_tab()
    
    def create_connection_tab(self):
        # Connection status
        status_frame = ttk.LabelFrame(self.connection_frame, text="Connection Status")
        status_frame.pack(fill="x", padx=10, pady=5)
        
        self.status_label = ttk.Label(status_frame, text="Disconnected", foreground="red")
        self.status_label.pack(pady=5)
        
        button_frame = ttk.Frame(status_frame)
        button_frame.pack(pady=5)
        
        self.connect_btn = ttk.Button(button_frame, text="Connect", command=self.connect_modem)
        self.connect_btn.pack(side="left", padx=5)
        
        self.disconnect_btn = ttk.Button(button_frame, text="Disconnect", command=self.disconnect_modem, state="disabled")
        self.disconnect_btn.pack(side="left", padx=5)
        
        # Modem Information
        info_frame = ttk.LabelFrame(self.connection_frame, text="Modem Information")
        info_frame.pack(fill="both", expand=True, padx=10, pady=5)
        
        self.info_text = scrolledtext.ScrolledText(info_frame, height=15, state="disabled")
        self.info_text.pack(fill="both", expand=True, padx=5, pady=5)
        
        # Refresh controls
        refresh_frame = ttk.Frame(self.connection_frame)
        refresh_frame.pack(fill="x", padx=10, pady=5)
        
        self.refresh_btn = ttk.Button(refresh_frame, text="Refresh Info", command=self.refresh_info)
        self.refresh_btn.pack(side="left", padx=5)
        
        ttk.Checkbutton(refresh_frame, text="Auto Refresh (5s)", variable=self.auto_refresh, 
                       command=self.toggle_auto_refresh).pack(side="left", padx=5)
    
    def create_gsm_tab(self):
        # APN Configuration
        apn_frame = ttk.LabelFrame(self.gsm_frame, text="APN Configuration")
        apn_frame.pack(fill="x", padx=10, pady=5)
        
        # APN
        ttk.Label(apn_frame, text="APN:").grid(row=0, column=0, sticky="w", padx=5, pady=2)
        self.apn_var = tk.StringVar()
        ttk.Entry(apn_frame, textvariable=self.apn_var, width=30).grid(row=0, column=1, padx=5, pady=2)
        
        # Username
        ttk.Label(apn_frame, text="Username:").grid(row=1, column=0, sticky="w", padx=5, pady=2)
        self.username_var = tk.StringVar()
        ttk.Entry(apn_frame, textvariable=self.username_var, width=30).grid(row=1, column=1, padx=5, pady=2)
        
        # Password
        ttk.Label(apn_frame, text="Password:").grid(row=2, column=0, sticky="w", padx=5, pady=2)
        self.password_var = tk.StringVar()
        ttk.Entry(apn_frame, textvariable=self.password_var, width=30, show="*").grid(row=2, column=1, padx=5, pady=2)
        
        apn_btn_frame = ttk.Frame(apn_frame)
        apn_btn_frame.grid(row=3, column=0, columnspan=2, pady=10)
        
        ttk.Button(apn_btn_frame, text="Set APN", command=self.set_apn).pack(side="left", padx=5)
        ttk.Button(apn_btn_frame, text="Get Current APN", command=self.get_apn).pack(side="left", padx=5)
        
        # Network Information
        network_frame = ttk.LabelFrame(self.gsm_frame, text="Network Information")
        network_frame.pack(fill="both", expand=True, padx=10, pady=5)
        
        # Signal strength
        signal_frame = ttk.Frame(network_frame)
        signal_frame.pack(fill="x", padx=5, pady=2)
        
        ttk.Label(signal_frame, text="Signal Strength:").pack(side="left")
        self.signal_label = ttk.Label(signal_frame, text="-", foreground="blue")
        self.signal_label.pack(side="left", padx=10)
        
        # Progress bar for signal
        self.signal_progress = ttk.Progressbar(signal_frame, length=200, maximum=100)
        self.signal_progress.pack(side="left", padx=10)
        
        # Network details
        details_frame = ttk.Frame(network_frame)
        details_frame.pack(fill="both", expand=True, padx=5, pady=5)
        
        self.network_info_text = scrolledtext.ScrolledText(details_frame, height=8, state="disabled")
        self.network_info_text.pack(fill="both", expand=True)
        
        # Connection test
        test_frame = ttk.Frame(self.gsm_frame)
        test_frame.pack(fill="x", padx=10, pady=5)
        
        self.test_btn = ttk.Button(test_frame, text="Test Internet Connection", command=self.test_internet)
        self.test_btn.pack(side="left", padx=5)
        
        self.connection_status = ttk.Label(test_frame, text="Not tested")
        self.connection_status.pack(side="left", padx=10)
    
    def create_gps_tab(self):
        # GPS Control
        control_frame = ttk.LabelFrame(self.gps_frame, text="GPS Control")
        control_frame.pack(fill="x", padx=10, pady=5)
        
        gps_btn_frame = ttk.Frame(control_frame)
        gps_btn_frame.pack(pady=5)
        
        self.start_gps_btn = ttk.Button(gps_btn_frame, text="Start GPS", command=self.start_gps)
        self.start_gps_btn.pack(side="left", padx=5)
        
        self.stop_gps_btn = ttk.Button(gps_btn_frame, text="Stop GPS", command=self.stop_gps, state="disabled")
        self.stop_gps_btn.pack(side="left", padx=5)
        
        self.gps_status_label = ttk.Label(control_frame, text="GPS Stopped", foreground="red")
        self.gps_status_label.pack(pady=5)
        
        # GPS Data Display
        data_frame = ttk.LabelFrame(self.gps_frame, text="GPS Data")
        data_frame.pack(fill="both", expand=True, padx=10, pady=5)
        
        # Create grid for GPS data
        labels = ["Fix Status:", "Latitude:", "Longitude:", "Altitude:", "Speed:", "Satellites:", "Time:"]
        self.gps_labels = {}
        
        for i, label in enumerate(labels):
            ttk.Label(data_frame, text=label).grid(row=i, column=0, sticky="w", padx=5, pady=2)
            value_label = ttk.Label(data_frame, text="-", foreground="blue")
            value_label.grid(row=i, column=1, sticky="w", padx=10, pady=2)
            self.gps_labels[label.replace(":", "")] = value_label
        
        # GPS Log
        log_frame = ttk.LabelFrame(self.gps_frame, text="GPS Log")
        log_frame.pack(fill="both", expand=True, padx=10, pady=5)
        
        self.gps_log = scrolledtext.ScrolledText(log_frame, height=8, state="disabled")
        self.gps_log.pack(fill="both", expand=True, padx=5, pady=5)
        
        # Clear log button
        ttk.Button(log_frame, text="Clear Log", command=self.clear_gps_log).pack(pady=2)
    
    def create_settings_tab(self):
        # Port Settings
        port_frame = ttk.LabelFrame(self.settings_frame, text="Port Settings")
        port_frame.pack(fill="x", padx=10, pady=5)
        
        ttk.Label(port_frame, text="AT Command Port:").grid(row=0, column=0, sticky="w", padx=5, pady=2)
        self.at_port_var = tk.StringVar(value="/dev/modem_at")
        ttk.Entry(port_frame, textvariable=self.at_port_var, width=20).grid(row=0, column=1, padx=5, pady=2)
        
        ttk.Label(port_frame, text="GPS Port:").grid(row=1, column=0, sticky="w", padx=5, pady=2)
        self.gps_port_var = tk.StringVar(value="/dev/modem_gps")
        ttk.Entry(port_frame, textvariable=self.gps_port_var, width=20).grid(row=1, column=1, padx=5, pady=2)
        
        # APN Presets
        preset_frame = ttk.LabelFrame(self.settings_frame, text="APN Presets (Indonesia)")
        preset_frame.pack(fill="x", padx=10, pady=5)
        
        presets = [
            ("Telkomsel", "telkomsel", "", ""),
            ("Indosat", "indosatgprs", "indosat", "indosat"),
            ("XL", "www.xlgprs.net", "xlgprs", "proxl"),
            ("3 (Tri)", "3gprs", "3gprs", "3gprs"),
            ("Smartfren", "smart", "", "")
        ]
        
        for i, (name, apn, user, pwd) in enumerate(presets):
            btn = ttk.Button(preset_frame, text=name, 
                           command=lambda a=apn, u=user, p=pwd: self.load_preset(a, u, p))
            btn.grid(row=i//3, column=i%3, padx=5, pady=2, sticky="ew")
        
        # Save/Load Configuration
        config_frame = ttk.LabelFrame(self.settings_frame, text="Configuration")
        config_frame.pack(fill="x", padx=10, pady=5)
        
        config_btn_frame = ttk.Frame(config_frame)
        config_btn_frame.pack(pady=5)
        
        ttk.Button(config_btn_frame, text="Save Config", command=self.save_config).pack(side="left", padx=5)
        ttk.Button(config_btn_frame, text="Load Config", command=self.load_config_from_button).pack(side="left", padx=5)
    
    def setup_layout(self):
        self.notebook.pack(fill="both", expand=True, padx=10, pady=10)
    
    def check_port_access(self, port):
        """Check if we can access the port"""
        try:
            # Cek apakah port ada
            if not os.path.exists(port):
                return False, f"Port {port} tidak ditemukan"
            
            # Cek symlink dan resolve target
            real_port = port
            if os.path.islink(port):
                target = os.readlink(port)
                if not target.startswith('/'):
                    real_port = os.path.join(os.path.dirname(port), target)
                else:
                    real_port = target
                print(f"[DEBUG] Symlink {port} -> {real_port}")
            
            # Test akses langsung
            try:
                fd = os.open(real_port, os.O_RDWR | os.O_NONBLOCK)
                os.close(fd)
                return True, "OK"
            except PermissionError:
                groups = os.getgroups()
                user_groups = [grp for grp in os.getgrouplist(os.getlogin(), os.getuid())]
                return False, f"Tidak ada permission untuk mengakses {real_port}. User groups: {user_groups}. Coba tambahkan user ke group dialout: sudo usermod -a -G dialout $USER"
            except Exception as e:
                return False, f"Error akses port: {str(e)}"
                
        except Exception as e:
            return False, f"Error checking port: {str(e)}"
    
    def connect_modem(self):
        try:
            from ec25_modem import EC25Modem
            
            at_port = self.at_port_var.get()
            gps_port = self.gps_port_var.get()
            
            print(f"[GUI] Trying to connect to AT port: {at_port}")
            print(f"[GUI] GPS port: {gps_port}")
            
            # Cek akses port
            can_access, msg = self.check_port_access(at_port)
            if not can_access:
                print(f"[GUI] Port access error: {msg}")
                messagebox.showerror("Error", msg)
                return
            
            # Cek permission detail
            try:
                if os.path.islink(at_port):
                    target = os.readlink(at_port)
                    real_path = target if target.startswith('/') else os.path.join(os.path.dirname(at_port), target)
                    stat_info = os.stat(real_path)
                else:
                    stat_info = os.stat(at_port)
                print(f"[GUI] Port permissions: {oct(stat_info.st_mode)}")
            except Exception as e:
                print(f"[GUI] Permission check error: {e}")
            
            self.modem = EC25Modem(at_port=at_port, gps_port=gps_port)
            
            if self.modem.connect():
                self.connected = True
                self.status_label.config(text="Connected", foreground="green")
                self.connect_btn.config(state="disabled")
                self.disconnect_btn.config(state="normal")
                self.refresh_info()
                messagebox.showinfo("Success", "Connected to modem successfully!")
            else:
                print("[GUI] Modem connect failed")
                messagebox.showerror("Error", "Failed to connect to modem!")
                
        except ImportError as e:
            print(f"[GUI] Import error: {e}")
            messagebox.showerror("Error", f"ec25_modem.py not found! Please ensure the modem library is available.")
        except Exception as e:
            print(f"[GUI] Connection failed: {str(e)}")
            import traceback
            traceback.print_exc()
            messagebox.showerror("Error", f"Connection failed: {str(e)}")
    
    def disconnect_modem(self):
        if self.modem:
            try:
                self.modem.disconnect()
            except Exception as e:
                print(f"[GUI] Error disconnecting modem: {e}")
            self.connected = False
            self.status_label.config(text="Disconnected", foreground="red")
            self.connect_btn.config(state="normal")
            self.disconnect_btn.config(state="disabled")
            
            # Stop auto refresh
            self.auto_refresh.set(False)
            self.toggle_auto_refresh()
            
            messagebox.showinfo("Info", "Disconnected from modem")
    
    def refresh_info(self):
        if not self.connected or not self.modem:
            return
        
        try:
            # Get modem info
            info = self.modem.get_modem_info()
            network = self.modem.get_network_info()
            
            # Update connection tab
            self.info_text.config(state="normal")
            self.info_text.delete(1.0, tk.END)
            
            info_text = f"=== Modem Information ===\n"
            for key, value in info.items():
                info_text += f"{key.capitalize()}: {value}\n"
            
            info_text += f"\n=== Network Information ===\n"
            info_text += f"Operator: {network.operator}\n"
            info_text += f"Registration: {network.registration_status}\n"
            info_text += f"Network Type: {network.network_type}\n"
            info_text += f"Signal Strength: {network.signal_strength} dBm\n"
            info_text += f"Signal Quality: {network.signal_quality}\n"
            info_text += f"Last Updated: {datetime.now().strftime('%H:%M:%S')}\n"
            
            self.info_text.insert(1.0, info_text)
            self.info_text.config(state="disabled")
            
            # Update GSM tab
            self.update_network_display(network)
            
        except Exception as e:
            self.log_message(f"Error refreshing info: {str(e)}")
            messagebox.showerror("Error", f"Error refreshing info: {str(e)}")
    
    def update_network_display(self, network):
        try:
            # Update signal strength
            signal_strength = network.signal_strength
            if signal_strength > -70:
                signal_color = "green"
                signal_percent = 100
            elif signal_strength > -85:
                signal_color = "orange"
                signal_percent = 75
            elif signal_strength > -100:
                signal_color = "red"
                signal_percent = 50
            else:
                signal_color = "darkred"
                signal_percent = 25
            
            self.signal_label.config(text=f"{signal_strength} dBm", foreground=signal_color)
            self.signal_progress["value"] = signal_percent
            
            # Update network info text
            self.network_info_text.config(state="normal")
            self.network_info_text.delete(1.0, tk.END)
            
            network_text = f"Operator: {network.operator}\n"
            network_text += f"Registration Status: {network.registration_status}\n"
            network_text += f"Network Type: {network.network_type}\n"
            network_text += f"Signal Strength: {network.signal_strength} dBm\n"
            network_text += f"Signal Quality: {network.signal_quality}\n"
            network_text += f"Last Updated: {datetime.now().strftime('%H:%M:%S')}\n"
            
            self.network_info_text.insert(1.0, network_text)
            self.network_info_text.config(state="disabled")
        except Exception as e:
            print(f"[GUI] Error updating network display: {e}")
    
    def toggle_auto_refresh(self):
        if self.auto_refresh.get() and self.connected:
            self.start_auto_refresh()
        else:
            self.stop_auto_refresh()
    
    def start_auto_refresh(self):
        if self.refresh_thread is None or not self.refresh_thread.is_alive():
            self.refresh_thread = threading.Thread(target=self.auto_refresh_worker)
            self.refresh_thread.daemon = True
            self.refresh_thread.start()
    
    def stop_auto_refresh(self):
        self.auto_refresh.set(False)
    
    def auto_refresh_worker(self):
        while self.auto_refresh.get() and self.connected:
            self.root.after(0, self.refresh_info)
            time.sleep(5)
    
    def set_apn(self):
        if not self.connected or not self.modem:
            messagebox.showerror("Error", "Not connected to modem!")
            return
        
        apn = self.apn_var.get().strip()
        username = self.username_var.get().strip()
        password = self.password_var.get().strip()
        
        if not apn:
            messagebox.showerror("Error", "APN cannot be empty!")
            return
        
        try:
            if self.modem.set_apn(apn, username, password):
                messagebox.showinfo("Success", f"APN set to: {apn}")
            else:
                messagebox.showerror("Error", "Failed to set APN!")
        except Exception as e:
            messagebox.showerror("Error", f"Error setting APN: {str(e)}")
    
    def get_apn(self):
        if not self.connected or not self.modem:
            messagebox.showerror("Error", "Not connected to modem!")
            return
        
        try:
            config = self.modem.get_apn_config()
            self.apn_var.set(config.get("apn", ""))
            self.username_var.set(config.get("username", ""))
            self.password_var.set(config.get("password", ""))
            messagebox.showinfo("Success", "Current APN configuration loaded!")
        except Exception as e:
            messagebox.showerror("Error", f"Error getting APN: {str(e)}")
    
    def load_preset(self, apn, username, password):
        self.apn_var.set(apn)
        self.username_var.set(username)
        self.password_var.set(password)
        messagebox.showinfo("Info", f"Loaded preset APN: {apn}")
    
    def test_internet(self):
        if not self.connected or not self.modem:
            messagebox.showerror("Error", "Not connected to modem!")
            return
        
        self.connection_status.config(text="Testing...", foreground="orange")
        self.root.update()
        
        def test_worker():
            try:
                result = self.modem.check_internet_connection()
                if result:
                    self.root.after(0, lambda: self.connection_status.config(text="Connected", foreground="green"))
                    self.root.after(0, lambda: messagebox.showinfo("Success", "Internet connection is working!"))
                else:
                    self.root.after(0, lambda: self.connection_status.config(text="No Internet", foreground="red"))
                    self.root.after(0, lambda: messagebox.showwarning("Warning", "No internet connection!"))
            except Exception as e:
                self.root.after(0, lambda: self.connection_status.config(text="Error", foreground="red"))
                self.root.after(0, lambda: messagebox.showerror("Error", f"Test failed: {str(e)}"))
        
        threading.Thread(target=test_worker, daemon=True).start()
    
    def start_gps(self):
        if not self.connected or not self.modem:
            messagebox.showerror("Error", "Not connected to modem!")
            return
        
        try:
            if self.modem.start_gps(callback=self.gps_callback):
                self.gps_status_label.config(text="GPS Started", foreground="green")
                self.start_gps_btn.config(state="disabled")
                self.stop_gps_btn.config(state="normal")
                self.log_gps("GPS started successfully")
            else:
                messagebox.showerror("Error", "Failed to start GPS!")
        except Exception as e:
            messagebox.showerror("Error", f"Error starting GPS: {str(e)}")
    
    def stop_gps(self):
        if not self.modem:
            return
        
        try:
            self.modem.stop_gps()
            self.gps_status_label.config(text="GPS Stopped", foreground="red")
            self.start_gps_btn.config(state="normal")
            self.stop_gps_btn.config(state="disabled")
            self.log_gps("GPS stopped")
            
            # Clear GPS data display
            for label in self.gps_labels.values():
                label.config(text="-")
                
        except Exception as e:
            messagebox.showerror("Error", f"Error stopping GPS: {str(e)}")
    
    def gps_callback(self, gps_data):
        # Update GPS display (called from GPS thread)
        self.root.after(0, lambda: self.update_gps_display(gps_data))
    
    def update_gps_display(self, gps_data):
        try:
            self.gps_labels["Fix Status"].config(text=gps_data.fix_status)
            self.gps_labels["Latitude"].config(text=f"{gps_data.latitude:.6f}")
            self.gps_labels["Longitude"].config(text=f"{gps_data.longitude:.6f}")
            self.gps_labels["Altitude"].config(text=f"{gps_data.altitude:.1f} m")
            self.gps_labels["Speed"].config(text=f"{gps_data.speed:.1f} km/h")
            self.gps_labels["Satellites"].config(text=str(gps_data.satellites))
            self.gps_labels["Time"].config(text=gps_data.timestamp)
            
            # Log GPS coordinates if we have a fix
            if gps_data.fix_status != "No Fix" and gps_data.latitude != 0 and gps_data.longitude != 0:
                log_entry = f"{datetime.now().strftime('%H:%M:%S')} - Lat: {gps_data.latitude:.6f}, Lon: {gps_data.longitude:.6f}, Alt: {gps_data.altitude:.1f}m, Sats: {gps_data.satellites}"
                self.log_gps(log_entry)
        except Exception as e:
            print(f"[GUI] Error updating GPS display: {e}")
    
    def log_gps(self, message):
        self.gps_log.config(state="normal")
        self.gps_log.insert(tk.END, f"{message}\n")
        self.gps_log.see(tk.END)
        self.gps_log.config(state="disabled")
    
    def clear_gps_log(self):
        self.gps_log.config(state="normal")
        self.gps_log.delete(1.0, tk.END)
        self.gps_log.config(state="disabled")
    
    def log_message(self, message):
        print(f"[GUI] LOG: {message}")
    
    def save_config(self):
        config = {
            "at_port": self.at_port_var.get(),
            "gps_port": self.gps_port_var.get(),
            "apn": self.apn_var.get(),
            "username": self.username_var.get(),
            "password": self.password_var.get()
        }
        
        try:
            with open(self.config_file, 'w') as f:
                json.dump(config, f, indent=2)
            messagebox.showinfo("Success", "Configuration saved!")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save config: {str(e)}")
    
    def load_config(self):
        # This is called during initialization - set defaults
        if not hasattr(self, 'at_port_var'):
            return  # Widgets not created yet
            
        if not os.path.exists(self.config_file):
            # Set default values
            self.at_port_var.set("/dev/modem_at")
            self.gps_port_var.set("/dev/modem_gps")
            return
        
        try:
            with open(self.config_file, 'r') as f:
                config = json.load(f)
            
            self.at_port_var.set(config.get("at_port", "/dev/modem_at"))
            self.gps_port_var.set(config.get("gps_port", "/dev/modem_gps"))
            self.apn_var.set(config.get("apn", ""))
            self.username_var.set(config.get("username", ""))
            self.password_var.set(config.get("password", ""))
            
        except Exception as e:
            self.log_message(f"Failed to load config: {str(e)}")
    
    def load_config_from_button(self):
        # This is called from button - load and show message
        if not os.path.exists(self.config_file):
            messagebox.showinfo("Info", "No configuration file found. Using defaults.")
            self.at_port_var.set("/dev/modem_at")
            self.gps_port_var.set("/dev/modem_gps")
            return
        
        try:
            with open(self.config_file, 'r') as f:
                config = json.load(f)
            
            self.at_port_var.set(config.get("at_port", "/dev/modem_at"))
            self.gps_port_var.set(config.get("gps_port", "/dev/modem_gps"))
            self.apn_var.set(config.get("apn", ""))
            self.username_var.set(config.get("username", ""))
            self.password_var.set(config.get("password", ""))
            
            messagebox.showinfo("Success", "Configuration loaded!")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load config: {str(e)}")
    
    def on_closing(self):
        if self.connected and self.modem:
            try:
                self.modem.disconnect()
            except Exception as e:
                print(f"[GUI] Error during disconnect: {e}")
        self.root.destroy()

def main():
    # Cek apakah dijalankan dengan sudo (optional warning)
    if os.geteuid() == 0:
        print("Warning: Running as root/sudo. This may not be necessary.")
    
    root = tk.Tk()
    app = ModemGUI(root)
    
    # Handle window closing
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    
    try:
        root.mainloop()
    except KeyboardInterrupt:
        print("\nApplication interrupted by user")
        if app.connected and app.modem:
            try:
                app.modem.disconnect()
            except Exception as e:
                print(f"Error during disconnect: {e}")

if __name__ == "__main__":
    main()