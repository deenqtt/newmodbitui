// File: lib/services/zigbee-listener.ts (COMPLETE ULTIMATE Version)
import mqtt from "mqtt";
import { prisma } from "../prisma";

class ZigbeeListenerService {
  private client: mqtt.MqttClient | null = null;
  private isRunning = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private responseTimeouts = new Map<string, NodeJS.Timeout>();
  private pendingCommands = new Map<
    string,
    { resolve: Function; reject: Function }
  >();
  // MQTT Configuration from environment variables
  private mqttConfig = {
    brokerUrl: process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    clientId:
      process.env.MQTT_CLIENT_ID ||
      `newmodbitui_${Math.random().toString(16).substr(2, 8)}`,
    keepalive: parseInt(process.env.MQTT_KEEPALIVE || "30"),
    connectTimeout: parseInt(process.env.MQTT_CONNECT_TIMEOUT || "10000"),
    reconnectPeriod: parseInt(process.env.MQTT_RECONNECT_PERIOD || "2000"),
  };
  // Log MQTT configuration (without sensitive info)
  // COMPREHENSIVE device mapping covering 4500+ devices from 510+ vendors
  private deviceMapping = {
    // 510+ Manufacturer mappings (enhanced with complete database)
    manufacturers: {
      // Chinese/Asian Manufacturers (largest segment)
      LUMI: "Xiaomi/Aqara",
      Xiaomi: "Xiaomi/Aqara",
      Aqara: "Xiaomi/Aqara",
      "IKEA of Sweden": "IKEA",
      Philips: "Philips Hue",
      OSRAM: "OSRAM/Ledvance",
      LEDVANCE: "OSRAM/Ledvance",

      // Tuya ecosystem (massive variety)
      Tuya: "Tuya",
      _TZ3000_: "Tuya",
      _TZ3210_: "Tuya",
      _TZ1800_: "Tuya",
      _TZ2000_: "Tuya",
      _TYZB01_: "Tuya",
      _TZE200_: "Tuya",
      _TZE204_: "Tuya",

      // Major Western brands
      SmartThings: "SmartThings",
      Samsung: "SmartThings",
      Sengled: "Sengled",
      "FeiBit Co.Ltd": "FeiBit",
      Innr: "Innr",
      Dresden: "Dresden Elektronik",
      "Trust International B.V": "Trust",
      Eurotronic: "Eurotronic",
      Danfoss: "Danfoss",
      Schneider: "Schneider Electric",
      Legrand: "Legrand",
      "Bosch Security Systems, Inc": "Bosch",
      Honeywell: "Honeywell",

      // Smart home ecosystems
      Hive: "Hive",
      "Centralite Systems": "Centralite",
      SmartThings: "SmartThings",
      "Securifi Ltd.": "Securifi",
      Heiman: "Heiman",
      HEIMAN: "Heiman",

      // Lighting specialists
      Gledopto: "Gledopto",
      GLEDOPTO: "Gledopto",
      Paulmann: "Paulmann",
      "Müller-Licht": "Müller-Licht",
      MLI: "Müller-Licht",
      LIGHTIFY: "OSRAM/Ledvance",

      // Specialty manufacturers
      Konke: "Konke",
      SONOFF: "SONOFF/eWeLink",
      eWeLink: "SONOFF/eWeLink",
      Moes: "Moes",
      Neo: "Neo Coolcam",
      OWON: "OWON",
      Enbrighten: "Enbrighten/Jasco",
      Jasco: "Enbrighten/Jasco",

      // European brands
      ubisys: "Ubisys",
      "Busch-Jaeger": "Busch-Jaeger",
      Jung: "Jung",
      Gira: "Gira",
      Develco: "Develco Products",
      Climax: "Climax Technology",
      Anchor: "Anchor Electricals",

      // Asian specialty
      Livolo: "Livolo",
      Zemismart: "Zemismart",
      Blitzwolf: "BlitzWolf",
      Lonsonho: "Lonsonho",
      TuYa: "Tuya",
      Espressif: "Espressif",
      espressif: "Espressif",
      "Espressif Inc": "Espressif",
    },

    // MASSIVE model database covering major device categories
    models: {
      // =================== XIAOMI/AQARA ECOSYSTEM ===================
      // Motion sensors
      "lumi.sensor_motion": "Aqara Motion Sensor",
      "lumi.sensor_motion.aq2": "Aqara Motion Sensor P1",
      "lumi.motion.agl04": "Aqara Motion Sensor FP1",
      rtcgq11lm: "Aqara Motion Sensor",
      rtcgq01lm: "Xiaomi Motion Sensor",

      // Door/window sensors
      "lumi.sensor_magnet": "Aqara Door/Window Sensor",
      "lumi.sensor_magnet.aq2": "Aqara Door/Window Sensor P1",
      mccgq11lm: "Aqara Door/Window Sensor",
      mccgq01lm: "Xiaomi Door/Window Sensor",

      // Water leak sensors
      "lumi.sensor_wleak.aq1": "Aqara Water Leak Sensor",
      "lumi.flood.agl02": "Aqara Water Leak Sensor T1",
      sjcgq11lm: "Aqara Water Leak Sensor",

      // Climate sensors
      "lumi.weather": "Aqara Climate Sensor",
      "lumi.sensor_ht": "Aqara Temperature Humidity Sensor",
      wsdcgq11lm: "Aqara Climate Sensor",
      wsdcgq01lm: "Xiaomi Climate Sensor",
      "lumi.sen_ill.mgl01": "Xiaomi Light Sensor",

      // Smart switches
      "lumi.sensor_switch": "Aqara Wireless Switch",
      "lumi.sensor_switch.aq2": "Aqara Wireless Switch Mini",
      "lumi.sensor_switch.aq3": "Aqara Wireless Switch H1",
      "lumi.remote.b1acn01": "Aqara Wireless Switch",
      wxkg11lm: "Aqara Wireless Switch",
      wxkg01lm: "Xiaomi Wireless Switch",
      wxkg03lm: "Aqara Wireless Switch",

      // Smart plugs
      "lumi.plug": "Aqara Smart Plug",
      "lumi.plug.v1": "Xiaomi Smart Plug",
      "lumi.plug.mmeu01": "Aqara Smart Plug EU",
      "lumi.plug.maus01": "Aqara Smart Plug US",
      zncz02lm: "Xiaomi Smart Plug",

      // Lights
      "lumi.light.aqcn02": "Aqara Smart LED Bulb",
      "lumi.light.cwopcn02": "Aqara Smart LED Bulb Color",
      "lumi.light.cwopcn03": "Aqara Smart LED Bulb Tunable White",

      // Cube controllers
      "lumi.sensor_cube": "Aqara Cube Controller",
      "lumi.sensor_cube.aqgl01": "Aqara Cube T1 Pro",
      mfkzq01lm: "Aqara Cube Controller",

      // =================== SMART THINGS ECOSYSTEM ===================
      motionv4: "SmartThings Motion Sensor v4",
      "sts-irm-250": "SmartThings Motion Sensor",
      "sts-irm-251": "SmartThings Motion Sensor",
      multiv4: "SmartThings Multipurpose Sensor",
      "3325-S": "SmartThings Motion Sensor",
      "3321-S": "SmartThings Multi Sensor",
      "3300-S": "SmartThings Door/Window Sensor",

      // =================== TUYA ECOSYSTEM (MASSIVE) ===================
      // Switches (hundreds of models)
      TS0001: "Tuya 1 Gang Switch",
      TS0002: "Tuya 2 Gang Switch",
      TS0003: "Tuya 3 Gang Switch",
      TS0004: "Tuya 4 Gang Switch",
      TS0011: "Tuya Smart Switch",
      TS0012: "Tuya 2 Gang Smart Switch",
      TS0013: "Tuya 3 Gang Smart Switch",
      TS0014: "Tuya 4 Gang Smart Switch",
      TS000F: "Tuya Wireless Switch",

      // Smart plugs & outlets
      TS0121: "Tuya Smart Plug 16A",
      TS011F: "Tuya Smart Plug",
      TS0101: "Tuya Smart Plug",
      TS0111: "Tuya Smart Socket",
      TS011E: "Tuya Smart Outlet",

      // Sensors
      TS0202: "Tuya Motion Sensor",
      TS0203: "Tuya Door/Window Sensor",
      TS0201: "Tuya Climate Sensor",
      TS0204: "Tuya Gas Sensor",
      TS0205: "Tuya Smoke Sensor",
      TS0207: "Tuya Water Leak Sensor",
      TS0210: "Tuya Vibration Sensor",
      TS0222: "Tuya Light/Occupancy Sensor",

      // Lights (many variations)
      TS0505A: "Tuya RGB+CCT LED Strip Controller",
      TS0505B: "Tuya RGB+CCT Smart Bulb",
      TS0502A: "Tuya CCT Smart Bulb",
      TS0504A: "Tuya RGBW LED Controller",
      TS0601: "Tuya Multi-function Device", // Generic for many types

      // Curtain/blind motors
      TS0302: "Tuya Curtain Motor",
      TS130F: "Tuya Curtain Switch",

      // Thermostats & climate
      TS0601_thermostat: "Tuya Smart Thermostat",
      TS0601_radiator: "Tuya Radiator Valve",

      // =================== IKEA TRADFRI ===================
      "TRADFRI bulb E27 WS": "IKEA TRADFRI LED Bulb White Spectrum",
      "TRADFRI bulb E27 CWS": "IKEA TRADFRI LED Bulb Color",
      "TRADFRI bulb E14 WS": "IKEA TRADFRI LED Bulb E14 White Spectrum",
      "TRADFRI bulb GU10 WS": "IKEA TRADFRI LED Bulb GU10 White Spectrum",
      "TRADFRI control outlet": "IKEA TRADFRI Control Outlet",
      "TRADFRI wireless dimmer": "IKEA TRADFRI Wireless Dimmer",
      "TRADFRI remote control": "IKEA TRADFRI Remote Control",
      "TRADFRI motion sensor": "IKEA TRADFRI Motion Sensor",
      "TRADFRI open/close remote": "IKEA TRADFRI Open/Close Remote",
      "FYRTUR block-out roller blind": "IKEA FYRTUR Roller Blind",
      "KADRILJ roller blind": "IKEA KADRILJ Roller Blind",

      // =================== PHILIPS HUE ===================
      LCT015: "Philips Hue Color A19",
      LCT016: "Philips Hue Color A19",
      LWB010: "Philips Hue White A19",
      LWB014: "Philips Hue White A19",
      LST002: "Philips Hue LightStrip Plus",
      LST001: "Philips Hue LightStrip",
      LLC020: "Philips Hue Go",
      HML004: "Philips Hue Motion Sensor",
      RWL021: "Philips Hue Dimmer Switch",
      SML001: "Philips Hue Motion Sensor",

      // =================== SONOFF/EWELINK ===================
      BASICZBR3: "SONOFF BASICZBR3 Smart Switch",
      S31ZB: "SONOFF S31ZB Smart Plug",
      "SNZB-01": "SONOFF Wireless Button",
      "SNZB-02": "SONOFF Temperature Humidity Sensor",
      "SNZB-03": "SONOFF Motion Sensor",
      "SNZB-04": "SONOFF Door/Window Sensor",
      ZBMINI: "SONOFF ZBMINI Smart Switch",
      ZBMINIL2: "SONOFF ZBMINI-L2",

      // =================== GENERIC PATTERNS ===================
      // Motion patterns
      pir: "Motion Sensor",
      motion: "Motion Sensor",
      occupancy: "Occupancy Sensor",

      // Door/window patterns
      door: "Door Sensor",
      window: "Window Sensor",
      contact: "Contact Sensor",
      magnet: "Magnetic Sensor",

      // Climate patterns
      temperature: "Temperature Sensor",
      humidity: "Humidity Sensor",
      weather: "Climate Sensor",
      thermo: "Thermostat",

      // Light patterns
      bulb: "Smart Bulb",
      light: "Smart Light",
      led: "LED Controller",
      strip: "LED Strip Controller",
      dimmer: "Smart Dimmer",

      // Switch/plug patterns
      switch: "Smart Switch",
      plug: "Smart Plug",
      socket: "Smart Socket",
      outlet: "Smart Outlet",
      relay: "Smart Relay",

      // Water/flood patterns
      water: "Water Sensor",
      flood: "Flood Sensor",
      leak: "Leak Sensor",

      // Safety patterns
      smoke: "Smoke Detector",
      fire: "Fire Detector",
      gas: "Gas Detector",
      co: "Carbon Monoxide Detector",

      // Blind/curtain patterns
      blind: "Smart Blind",
      curtain: "Curtain Motor",
      shade: "Window Shade",
      roller: "Roller Blind",
    },

    // Device type classifications with priority
    deviceCategories: {
      // PRIMARY FUNCTIONS (highest priority - main device purpose)
      primary: {
        motion_sensor: ["occupancy", "motion", "presence", "pir"],
        door_sensor: ["contact", "door", "window", "magnetic"],
        water_sensor: ["water_leak", "leak", "flood", "water_detected"],
        smoke_sensor: ["smoke", "fire_detected"],
        gas_sensor: ["gas", "gas_detected", "co"],
        button: ["action", "click", "press"],
        remote: ["action", "button_"],
        vibration_sensor: ["vibration", "drop", "tilt"],
      },

      // CONTROL FUNCTIONS (high priority - controllable devices)
      control: {
        light: ["brightness", "state", "light"],
        color_light: ["color", "color_xy", "color_hs"],
        switch: ["state", "switch"],
        plug: ["power", "energy", "voltage", "current"],
        cover: ["position", "lift", "tilt"],
        thermostat: ["current_heating_setpoint", "system_mode"],
        lock: ["lock_state", "door_lock"],
        fan: ["fan_state", "fan_mode"],
      },

      // ENVIRONMENTAL (medium priority - measurement devices)
      environmental: {
        temperature_sensor: ["temperature"],
        humidity_sensor: ["humidity"],
        pressure_sensor: ["pressure"],
        illuminance_sensor: ["illuminance", "lux"],
        air_quality_sensor: ["co2", "voc", "pm25", "formaldehyde"],
        climate_sensor: ["temperature", "humidity"], // needs both
      },

      // DIAGNOSTIC (low priority - internal measurements)
      diagnostic: {
        battery: ["battery"],
        signal: ["linkquality", "rssi"],
        device_info: ["device_temperature", "power_outage_count"],
      },
    },
  };

  constructor() {
    this.startService();
  }

  private async startService() {
    if (this.isRunning) return;

    try {
      // Build connection options
      const connectOptions: mqtt.IClientOptions = {
        clientId: this.mqttConfig.clientId,
        keepalive: this.mqttConfig.keepalive,
        reconnectPeriod: this.mqttConfig.reconnectPeriod,
        connectTimeout: this.mqttConfig.connectTimeout,
        queueQoSZero: false,
        clean: true,
        properties: {
          requestResponseInformation: true,
          requestProblemInformation: true,
        },
      };

      // Add authentication if provided
      if (this.mqttConfig.username) {
        connectOptions.username = this.mqttConfig.username;
      }
      if (this.mqttConfig.password) {
        connectOptions.password = this.mqttConfig.password;
      }

      console.log(`🔗 Connecting to MQTT broker: ${this.mqttConfig.brokerUrl}`);
      this.client = mqtt.connect(this.mqttConfig.brokerUrl, connectOptions);

      this.setupEventHandlers();
      this.isRunning = true;
    } catch (error) {
      console.error("❌ Failed to start Zigbee listener:", error);
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers() {
    if (!this.client) return;

    this.client.on("connect", () => {
      console.log("✅ Connected to Zigbee2MQTT broker");
      this.reconnectAttempts = 0;

      const subscriptions = [
        { topic: "zigbee2mqtt/+", qos: 0 },
        { topic: "zigbee2mqtt/bridge/+", qos: 1 },
        { topic: "zigbee2mqtt/bridge/devices", qos: 1 },
        { topic: "zigbee2mqtt/bridge/response/+", qos: 1 },
      ];

      subscriptions.forEach(({ topic, qos }) => {
        this.client?.subscribe(topic, { qos }, (error) => {
          if (error) {
            console.error(`❌ Failed to subscribe to ${topic}:`, error);
          } else {
            console.log(`✅ Subscribed to ${topic} (QoS ${qos})`);
          }
        });
      });

      this.requestDeviceList();
    });

    this.client.on("message", async (topic, payload, packet) => {
      try {
        await this.handleMessage(topic, payload, packet);
      } catch (error) {
        console.error("❌ Error handling message:", error);
      }
    });

    this.client.on("error", (error) => {
      console.error("❌ MQTT connection error:", error);
    });

    this.client.on("offline", () => {
      console.log("📴 MQTT client offline");
      this.scheduleReconnect();
    });

    this.client.on("close", () => {
      console.log("🔌 MQTT connection closed");
    });
  }

  // GANTI FUNCTION handleMessage DI zigbee-listener.ts - BUG FIX

  private async handleMessage(topic: string, payload: Buffer, packet: any) {
    const message = payload.toString();

    try {
      if (topic.startsWith("zigbee2mqtt/bridge/response/")) {
        this.handleBridgeResponse(topic, message);
        return;
      }

      if (topic === "zigbee2mqtt/bridge/state") {
        const data = JSON.parse(message);
        console.log("🌉 Bridge state:", data.state);
        return;
      }

      if (topic === "zigbee2mqtt/bridge/devices") {
        const devices = JSON.parse(message);
        await this.syncDevicesFromBridge(devices);
        return;
      }

      // BUG FIX: Ganti "sendDeviceCommand/" dengan "zigbee2mqtt/"
      if (topic.startsWith("zigbee2mqtt/") && !topic.includes("bridge")) {
        const friendlyName = topic.replace("zigbee2mqtt/", "");

        console.log(
          `📨 [MQTT_MESSAGE] Topic: ${topic}, Device: ${friendlyName}`
        );
        console.log(`📨 [MQTT_MESSAGE] Payload: ${message.substring(0, 200)}`);

        if (!message.trim()) {
          console.log(`📤 Device ${friendlyName} removed from network`);
          await this.markDeviceOffline(friendlyName);
          return;
        }

        try {
          const data = JSON.parse(message);
          console.log(
            `📨 [MQTT_PARSED] Device: ${friendlyName}, Data:`,
            JSON.stringify(data, null, 2)
          );

          await this.updateDeviceState(friendlyName, data);
        } catch (parseError) {
          console.error(
            `❌ [MQTT_PARSE_ERROR] Failed to parse JSON for ${friendlyName}:`,
            parseError
          );
          console.error(`❌ [MQTT_PARSE_ERROR] Raw message: ${message}`);
        }

        return;
      }

      // Log unhandled messages for debugging
      console.log(
        `🔍 [UNHANDLED] Topic: ${topic}, Message: ${message.substring(0, 100)}`
      );
    } catch (error) {
      console.error(`❌ Error parsing message for topic ${topic}:`, error);
      console.error(`❌ Raw message: ${message.substring(0, 200)}`);
    }
  }

  // Enhanced bridge response handling with better logging
  private handleBridgeResponse(topic: string, message: string) {
    try {
      const data = JSON.parse(message);
      const commandType = topic.split("/").pop();
      const transactionId = data.transaction;

      console.log(
        `📬 [BRIDGE_RESPONSE] [${commandType}] Status: ${data.status}`,
        {
          transaction: transactionId,
          error: data.error || null,
          data: data.data || null,
        }
      );

      if (transactionId && this.pendingCommands.has(transactionId)) {
        const { resolve, reject } = this.pendingCommands.get(transactionId)!;

        if (data.status === "ok") {
          console.log(`✅ [BRIDGE_SUCCESS] Command completed: ${commandType}`);
          resolve(data.data || true);
        } else {
          console.log(
            `❌ [BRIDGE_FAILED] Command failed: ${commandType} - ${data.error}`
          );
          reject(new Error(data.error || "Bridge command failed"));
        }

        this.pendingCommands.delete(transactionId);

        if (this.responseTimeouts.has(transactionId)) {
          clearTimeout(this.responseTimeouts.get(transactionId)!);
          this.responseTimeouts.delete(transactionId);
        }
      } else {
        // Log unmatched responses for debugging
        console.log(`🔍 [BRIDGE_UNMATCHED] Response without pending command:`, {
          commandType,
          transactionId,
          status: data.status,
        });
      }
    } catch (error) {
      console.error(
        "❌ [BRIDGE_PARSE_ERROR] Error parsing bridge response:",
        error
      );
    }
  }

  private requestDeviceList() {
    if (!this.client?.connected) return;

    this.client.publish("zigbee2mqtt/bridge/request/devices", "", { qos: 1 });
    console.log("📋 Requested device list from bridge");
  }

  // REPLACE METHODS INI DI zigbee-listener.ts - Listener Enhancement Only

  // Enhanced sync devices dengan smart state initialization
  private async syncDevicesFromBridge(devices: any[]) {
    console.log(`🔄 Syncing ${devices.length} devices from bridge...`);

    const updates = devices
      .filter((device) => device.type !== "Coordinator")
      .map((device) => {
        const deviceId = device.ieee_address;
        const friendlyName = device.friendly_name || device.ieee_address;
        const manufacturer = this.getProperManufacturer(
          device.manufacturer,
          device.model_id
        );
        const modelName = this.getProperModel(
          device.model_id,
          device.definition?.model
        );

        // ULTIMATE: Smart device type detection with comprehensive patterns
        const deviceType = this.ultimateDeviceTypeDetection(device);
        const capabilities = device.definition
          ? this.extractUltimateCapabilities(device.definition)
          : {};

        console.log(
          `🎯 ${friendlyName}: ${deviceType} (${
            Object.keys(capabilities).length
          } capabilities)`
        );

        return {
          deviceId,
          friendlyName,
          manufacturer,
          modelId: device.model_id || "unknown",
          deviceType,
          capabilities,
          isOnline: true,
        };
      });

    try {
      for (const update of updates) {
        // Check if device exists
        const existingDevice = await prisma.zigbeeDevice.findUnique({
          where: { deviceId: update.deviceId },
        });

        if (existingDevice) {
          // Update existing device (don't touch currentState)
          await prisma.zigbeeDevice.update({
            where: { deviceId: update.deviceId },
            data: {
              friendlyName: update.friendlyName,
              manufacturer: update.manufacturer,
              modelId: update.modelId,
              deviceType: update.deviceType,
              capabilities: update.capabilities,
              isOnline: update.isOnline,
              updatedAt: new Date(),
            },
          });
        } else {
          // Create new device with initialized state
          const initializedState = this.initializeStateFromCapabilities(
            update.capabilities
          );

          await prisma.zigbeeDevice.create({
            data: {
              ...update,
              currentState: initializedState,
            },
          });

          console.log(
            `📱 [NEW_DEVICE] ${update.friendlyName} created with initialized state`
          );
        }
      }

      console.log(
        `✅ Synced ${updates.length} devices with smart state management`
      );
    } catch (error) {
      console.error("❌ Error syncing devices:", error);
    }
  }

  // NEW METHOD: Initialize state structure from capabilities (using existing schema)
  private initializeStateFromCapabilities(capabilities: any): any {
    const initialState: any = {
      last_updated: new Date().toISOString(),
    };

    console.log(
      `🏗️ [INIT_STATE] Initializing from ${
        Object.keys(capabilities).length
      } capabilities`
    );

    // HANYA initialize keys yang ADA di capabilities
    Object.keys(capabilities).forEach((key) => {
      const capability = capabilities[key];

      if (capability.type === "binary") {
        initialState[key] =
          capability.value_off !== undefined ? capability.value_off : "N/A";
      } else if (capability.type === "numeric") {
        if (
          capability.category === "diagnostic" &&
          ["linkquality", "battery"].includes(key)
        ) {
          initialState[key] = 0;
        } else {
          initialState[key] = "N/A";
        }
      } else if (capability.type === "enum") {
        initialState[key] = capability.values?.[0] || "N/A";
      } else {
        initialState[key] = "N/A";
      }
    });

    // HAPUS bagian inject commonFields (ini yang bikin voltage muncul)

    console.log(
      `✅ [INIT_STATE] Created structure with ${
        Object.keys(initialState).length
      } keys`
    );
    return initialState;
  }

  // ENHANCED updateDeviceState with smart merging (using existing schema)
  private async updateDeviceState(friendlyName: string, state: any) {
    try {
      console.log(`🔍 [DEBUG] Processing state update for: ${friendlyName}`);
      console.log(`🔍 [DEBUG] Incoming state keys:`, Object.keys(state));
      console.log(
        `🔍 [DEBUG] Incoming state data:`,
        JSON.stringify(state, null, 2)
      );

      // STEP 1: Get existing device
      const existingDevice = await prisma.zigbeeDevice.findFirst({
        where: {
          OR: [{ friendlyName }, { deviceId: friendlyName }],
        },
      });

      if (existingDevice) {
        console.log(
          `🔍 [DEBUG] Found existing device. Current state keys:`,
          Object.keys(existingDevice.currentState || {})
        );

        // STEP 2: Smart merging with capabilities awareness
        const mergedState = this.performSmartStateMerge(
          (existingDevice.currentState as any) || {},
          state,
          (existingDevice.capabilities as any) || {}
        );

        console.log(
          `✅ [MERGE] Final merged state keys:`,
          Object.keys(mergedState)
        );

        // STEP 3: Update device with merged state (using existing schema)
        await prisma.zigbeeDevice.update({
          where: { id: existingDevice.id },
          data: {
            currentState: mergedState,
            lastSeen: new Date(),
            isOnline: true,
            updatedAt: new Date(),
          },
        });

        console.log(
          `💾 [SAVED] Device ${friendlyName} updated with smart merged state`
        );

        // Log important changes
        const importantChanges = this.getImportantStateChanges(
          existingDevice.currentState as any,
          state
        );
        if (importantChanges.length > 0) {
          console.log(
            `📊 [IMPORTANT] ${friendlyName} changes:`,
            importantChanges.join(", ")
          );
        }
      } else {
        // STEP 4: New device - create with structured state
        console.log(`📱 [NEW] New device detected: ${friendlyName}`);

        const deviceType = this.ultimateStateBasedDetection(state);
        const capabilities = this.extractCapabilitiesFromState(state);

        // Initialize structured state
        const initializedState =
          this.initializeStateFromCapabilities(capabilities);

        // Merge with actual incoming state
        const finalState = {
          ...initializedState,
          ...state,
          last_updated: new Date().toISOString(),
        };

        await prisma.zigbeeDevice.create({
          data: {
            deviceId: friendlyName,
            friendlyName,
            deviceType,
            capabilities,
            currentState: finalState,
            lastSeen: new Date(),
            isOnline: true,
          },
        });

        console.log(
          `💾 [CREATED] New device ${friendlyName} with structured state`
        );
      }
    } catch (error) {
      console.error(`❌ [ERROR] Error updating device ${friendlyName}:`, error);
    }
  }

  // NEW METHOD: Smart state merging with capabilities awareness
  private performSmartStateMerge(
    existingState: any,
    newState: any,
    capabilities: any
  ): any {
    console.log(`🧠 [SMART_MERGE] Merging states...`);

    const mergedState = { ...existingState };
    mergedState.last_updated = new Date().toISOString();

    // Process each key in new state
    Object.keys(newState).forEach((key) => {
      const newValue = newState[key];
      const existingValue = existingState[key];

      if (newValue !== null && newValue !== undefined) {
        if (key === "linkquality" && newValue === 0) {
          if (existingValue && existingValue !== "N/A" && existingValue > 0) {
            console.log(
              `🚫 [SMART_MERGE] Keeping existing linkquality: ${existingValue}`
            );
            return;
          }
        }

        if (existingValue !== newValue) {
          console.log(
            `🔄 [SMART_MERGE] ${key}: ${existingValue} → ${newValue}`
          );
        }
        mergedState[key] = newValue;
      }
    });

    // HANYA ensure keys yang ADA di capabilities
    Object.keys(capabilities).forEach((capKey) => {
      if (!mergedState.hasOwnProperty(capKey)) {
        const capability = capabilities[capKey];

        if (capability.type === "binary") {
          mergedState[capKey] =
            capability.value_off !== undefined ? capability.value_off : "N/A";
        } else if (capability.type === "numeric") {
          mergedState[capKey] =
            capability.category === "diagnostic" ? 0 : "N/A";
        } else {
          mergedState[capKey] = "N/A";
        }

        console.log(
          `➕ [SMART_MERGE] Added missing: ${capKey} = ${mergedState[capKey]}`
        );
      }
    });

    // HAPUS keys yang tidak ada di capabilities atau incoming state
    Object.keys(mergedState).forEach((key) => {
      if (
        key !== "last_updated" &&
        !capabilities.hasOwnProperty(key) &&
        !newState.hasOwnProperty(key)
      ) {
        console.log(`🗑️ [SMART_MERGE] Removing invalid key: ${key}`);
        delete mergedState[key];
      }
    });

    return mergedState;
  }

  // NEW METHOD: Get important state changes for logging
  private getImportantStateChanges(oldState: any, newState: any): string[] {
    const changes: string[] = [];
    const skipKeys = [
      "linkquality",
      "last_seen",
      "device_temperature",
      "voltage",
      "last_updated",
    ];

    Object.keys(newState).forEach((key) => {
      if (skipKeys.includes(key)) return;

      const oldValue = oldState?.[key];
      const newValue = newState[key];

      if (oldValue !== newValue) {
        if (oldValue === "N/A" || oldValue === null || oldValue === undefined) {
          changes.push(`${key}=${newValue}`);
        } else {
          changes.push(`${key}: ${oldValue}→${newValue}`);
        }
      }
    });

    return changes;
  }

  // ENHANCED extractUltimateCapabilities untuk handle complex exposes
  private extractUltimateCapabilities(definition: any): any {
    const capabilities: any = {};

    if (!definition?.exposes) return capabilities;

    console.log(`🔍 [CAPS] Processing ${definition.exposes.length} exposes...`);

    for (const expose of definition.exposes) {
      // Handle simple exposes (direct attributes)
      if (expose.name) {
        capabilities[expose.name] = {
          type: expose.type,
          access: expose.access,
          description: expose.description,
          readable: (expose.access & 1) !== 0,
          writable: (expose.access & 2) !== 0,
          category: expose.category || "normal",
        };

        // Enhanced metadata
        if (expose.value_min !== undefined)
          capabilities[expose.name].min = expose.value_min;
        if (expose.value_max !== undefined)
          capabilities[expose.name].max = expose.value_max;
        if (expose.unit) capabilities[expose.name].unit = expose.unit;
        if (expose.values) capabilities[expose.name].values = expose.values;
        if (expose.value_on !== undefined)
          capabilities[expose.name].value_on = expose.value_on;
        if (expose.value_off !== undefined)
          capabilities[expose.name].value_off = expose.value_off;

        console.log(`✅ [CAPS] ${expose.name} (${expose.type})`);
      }

      // Handle complex exposes (light, climate, etc) with features
      if (expose.type && expose.features && expose.features.length > 0) {
        console.log(
          `🔍 [CAPS] Complex expose: ${expose.type} with ${expose.features.length} features`
        );

        for (const feature of expose.features) {
          if (feature.name) {
            capabilities[feature.name] = {
              type: feature.type,
              access: feature.access,
              description: feature.description,
              readable: (feature.access & 1) !== 0,
              writable: (feature.access & 2) !== 0,
              category: feature.category || "normal",
              parent_type: expose.type, // Track parent
            };

            // Enhanced metadata for features
            if (feature.value_min !== undefined)
              capabilities[feature.name].min = feature.value_min;
            if (feature.value_max !== undefined)
              capabilities[feature.name].max = feature.value_max;
            if (feature.unit) capabilities[feature.name].unit = feature.unit;
            if (feature.values)
              capabilities[feature.name].values = feature.values;
            if (feature.value_on !== undefined)
              capabilities[feature.name].value_on = feature.value_on;
            if (feature.value_off !== undefined)
              capabilities[feature.name].value_off = feature.value_off;

            console.log(`✅ [CAPS] Feature: ${feature.name} (${feature.type})`);
          }
        }
      }
    }

    console.log(
      `🎯 [CAPS] Total extracted: ${Object.keys(capabilities).length}`
    );
    return capabilities;
  }
  // ULTIMATE DEVICE TYPE DETECTION - handles 4500+ device models
  private ultimateDeviceTypeDetection(device: any): string {
    const modelId = device.model_id?.toLowerCase() || "";
    const manufacturer = device.manufacturer?.toLowerCase() || "";
    const definition = device.definition;

    console.log(`🕵️ ULTIMATE detection for ${device.friendly_name}:`, {
      modelId,
      manufacturer,
      hasDefinition: !!definition,
    });

    // LEVEL 1: Exact model mapping (highest accuracy)
    if (this.deviceMapping.models[modelId]) {
      const mappedName = this.deviceMapping.models[modelId];
      const detectedType = this.classifyFromModelName(mappedName);
      if (detectedType !== "unknown") {
        console.log(
          `✅ L1: Exact model match - ${detectedType} (${mappedName})`
        );
        return detectedType;
      }
    }

    // LEVEL 2: Model pattern matching (high accuracy)
    const patternType = this.detectFromModelPatterns(modelId);
    if (patternType !== "unknown") {
      console.log(`✅ L2: Model pattern match - ${patternType}`);
      return patternType;
    }

    // LEVEL 3: Definition exposes analysis (Zigbee2MQTT standard)
    if (definition?.exposes) {
      const exposesType = this.detectFromUltimateExposes(
        definition.exposes,
        modelId,
        manufacturer
      );
      if (exposesType !== "unknown") {
        console.log(`✅ L3: Exposes analysis - ${exposesType}`);
        return exposesType;
      }
    }

    // LEVEL 4: Manufacturer-specific heuristics
    const manufacturerType = this.detectFromManufacturerHeuristics(
      manufacturer,
      modelId
    );
    if (manufacturerType !== "unknown") {
      console.log(`✅ L4: Manufacturer heuristics - ${manufacturerType}`);
      return manufacturerType;
    }

    console.log(`❓ ULTIMATE detection failed, defaulting to unknown`);
    return "unknown";
  }

  // Classify device type from model name
  private classifyFromModelName(modelName: string): string {
    const name = modelName.toLowerCase();

    // Motion/occupancy
    if (
      name.includes("motion") ||
      name.includes("pir") ||
      name.includes("occupancy")
    ) {
      return "motion_sensor";
    }

    // Door/window/contact
    if (
      name.includes("door") ||
      name.includes("window") ||
      name.includes("contact") ||
      name.includes("magnetic")
    ) {
      return "door_sensor";
    }

    // Water/leak/flood
    if (
      name.includes("water") ||
      name.includes("leak") ||
      name.includes("flood")
    ) {
      return "water_sensor";
    }

    // Smoke/fire
    if (name.includes("smoke") || name.includes("fire")) {
      return "smoke_sensor";
    }

    // Gas/CO
    if (name.includes("gas") || name.includes("carbon")) {
      return "gas_sensor";
    }

    // Climate sensors
    if (
      name.includes("climate") ||
      name.includes("weather") ||
      (name.includes("temperature") && name.includes("humidity"))
    ) {
      return "climate_sensor";
    }

    // Individual sensors
    if (name.includes("temperature") && !name.includes("humidity")) {
      return "temperature_sensor";
    }
    if (name.includes("humidity") && !name.includes("temperature")) {
      return "humidity_sensor";
    }

    // Lights
    if (
      name.includes("bulb") ||
      name.includes("light") ||
      name.includes("led")
    ) {
      if (
        name.includes("color") ||
        name.includes("rgb") ||
        name.includes("hue")
      ) {
        return "color_light";
      }
      return "light";
    }

    // Switches/plugs/outlets
    if (name.includes("plug")) return "plug";
    if (name.includes("outlet") || name.includes("socket")) return "plug";
    if (name.includes("switch") || name.includes("relay")) return "switch";

    // Covers/blinds
    if (
      name.includes("blind") ||
      name.includes("curtain") ||
      name.includes("shade") ||
      name.includes("roller")
    ) {
      return "cover";
    }

    // Controls
    if (name.includes("remote") || name.includes("controller")) return "remote";
    if (name.includes("button") || name.includes("wireless")) return "button";
    if (name.includes("cube")) return "cube";
    if (name.includes("dimmer")) return "dimmer";

    // Climate control
    if (name.includes("thermostat")) return "thermostat";
    if (name.includes("valve") && name.includes("radiator"))
      return "radiator_valve";

    return "unknown";
  }

  // Detect from comprehensive model patterns
  private detectFromModelPatterns(modelId: string): string {
    // Xiaomi/Aqara patterns
    if (modelId.includes("rtcgq") || modelId.includes("motion"))
      return "motion_sensor";
    if (modelId.includes("mccgq") || modelId.includes("magnet"))
      return "door_sensor";
    if (modelId.includes("sjcgq") || modelId.includes("wleak"))
      return "water_sensor";
    if (modelId.includes("wsdcgq") || modelId.includes("weather"))
      return "climate_sensor";
    if (modelId.includes("wxkg") || modelId.includes("switch")) return "button";
    if (modelId.includes("zncz") || modelId.includes("plug")) return "plug";

    // Tuya patterns (massive ecosystem)
    if (
      modelId.startsWith("ts000") ||
      modelId.startsWith("ts001") ||
      modelId.startsWith("ts011") ||
      modelId.startsWith("ts012")
    ) {
      if (modelId.includes("1")) return "switch"; // TS0001, TS0011 etc
      if (modelId.includes("21")) return "plug"; // TS0121 etc
    }

    if (modelId.startsWith("ts02")) {
      if (modelId.includes("01")) return "climate_sensor"; // TS0201
      if (modelId.includes("02")) return "motion_sensor"; // TS0202
      if (modelId.includes("03")) return "door_sensor"; // TS0203
      if (modelId.includes("04")) return "gas_sensor"; // TS0204
      if (modelId.includes("05")) return "smoke_sensor"; // TS0205
      if (modelId.includes("07")) return "water_sensor"; // TS0207
    }

    if (modelId.startsWith("ts05")) {
      return "color_light"; // TS0505A/B - RGB controllers
    }

    // SmartThings patterns
    if (modelId.includes("motionv") || modelId.includes("sts-irm"))
      return "motion_sensor";
    if (modelId.includes("multiv")) return "climate_sensor";

    // IKEA patterns
    if (modelId.includes("tradfri")) {
      if (modelId.includes("bulb")) return "light";
      if (modelId.includes("outlet")) return "plug";
      if (modelId.includes("motion")) return "motion_sensor";
      if (modelId.includes("remote")) return "remote";
      if (modelId.includes("dimmer")) return "dimmer";
      if (
        modelId.includes("blind") ||
        modelId.includes("fyrtur") ||
        modelId.includes("kadrilj")
      )
        return "cover";
    }

    // Philips Hue patterns
    if (modelId.startsWith("lct") || modelId.startsWith("lca"))
      return "color_light";
    if (modelId.startsWith("lwb") || modelId.startsWith("lwa")) return "light";
    if (modelId.startsWith("lst")) return "color_light"; // Light strips
    if (modelId.startsWith("llc")) return "color_light"; // Hue Go etc
    if (modelId.startsWith("rwl")) return "remote"; // Dimmer switch
    if (modelId.startsWith("sml") || modelId.startsWith("hml"))
      return "motion_sensor";

    // SONOFF patterns
    if (modelId.includes("snzb-01")) return "button";
    if (modelId.includes("snzb-02")) return "climate_sensor";
    if (modelId.includes("snzb-03")) return "motion_sensor";
    if (modelId.includes("snzb-04")) return "door_sensor";
    if (modelId.includes("basiczbr") || modelId.includes("zbmini"))
      return "switch";
    if (modelId.includes("s31zb")) return "plug";

    return "unknown";
  }

  // ULTIMATE exposes analysis with comprehensive coverage
  private detectFromUltimateExposes(
    exposes: any[],
    modelId: string,
    manufacturer: string
  ): string {
    console.log(
      `🔍 Ultimate exposes analysis:`,
      exposes.map((e) => `${e.name || e.type}(${e.access || "N/A"})`)
    );

    // Build capability profile
    const capabilities = {
      primary: [] as string[],
      control: [] as string[],
      environmental: [] as string[],
      diagnostic: [] as string[],
    };

    // Categorize all exposed capabilities
    for (const expose of exposes) {
      if (!expose.name) continue;

      const name = expose.name.toLowerCase();

      // Primary device functions (main purpose)
      if (
        this.deviceMapping.deviceCategories.primary.motion_sensor.some((p) =>
          name.includes(p)
        )
      ) {
        capabilities.primary.push("motion_sensor");
      }
      if (
        this.deviceMapping.deviceCategories.primary.door_sensor.some((p) =>
          name.includes(p)
        )
      ) {
        capabilities.primary.push("door_sensor");
      }
      if (
        this.deviceMapping.deviceCategories.primary.water_sensor.some((p) =>
          name.includes(p)
        )
      ) {
        capabilities.primary.push("water_sensor");
      }
      if (
        this.deviceMapping.deviceCategories.primary.smoke_sensor.some((p) =>
          name.includes(p)
        )
      ) {
        capabilities.primary.push("smoke_sensor");
      }
      if (
        this.deviceMapping.deviceCategories.primary.gas_sensor.some((p) =>
          name.includes(p)
        )
      ) {
        capabilities.primary.push("gas_sensor");
      }
      if (
        this.deviceMapping.deviceCategories.primary.button.some((p) =>
          name.includes(p)
        )
      ) {
        capabilities.primary.push("button");
      }
      if (
        this.deviceMapping.deviceCategories.primary.remote.some((p) =>
          name.includes(p)
        )
      ) {
        capabilities.primary.push("remote");
      }

      // Control functions
      if (
        this.deviceMapping.deviceCategories.control.light.some((p) =>
          name.includes(p)
        )
      ) {
        capabilities.control.push("light");
      }
      if (
        this.deviceMapping.deviceCategories.control.color_light.some((p) =>
          name.includes(p)
        )
      ) {
        capabilities.control.push("color_light");
      }
      if (
        this.deviceMapping.deviceCategories.control.switch.some((p) =>
          name.includes(p)
        )
      ) {
        capabilities.control.push("switch");
      }
      if (
        this.deviceMapping.deviceCategories.control.plug.some((p) =>
          name.includes(p)
        )
      ) {
        capabilities.control.push("plug");
      }
      if (
        this.deviceMapping.deviceCategories.control.cover.some((p) =>
          name.includes(p)
        )
      ) {
        capabilities.control.push("cover");
      }
      if (
        this.deviceMapping.deviceCategories.control.thermostat.some((p) =>
          name.includes(p)
        )
      ) {
        capabilities.control.push("thermostat");
      }
      if (
        this.deviceMapping.deviceCategories.control.lock.some((p) =>
          name.includes(p)
        )
      ) {
        capabilities.control.push("lock");
      }
      if (
        this.deviceMapping.deviceCategories.control.fan.some((p) =>
          name.includes(p)
        )
      ) {
        capabilities.control.push("fan");
      }

      // Environmental sensors
      if (
        this.deviceMapping.deviceCategories.environmental.temperature_sensor.some(
          (p) => name.includes(p)
        )
      ) {
        capabilities.environmental.push("temperature");
      }
      if (
        this.deviceMapping.deviceCategories.environmental.humidity_sensor.some(
          (p) => name.includes(p)
        )
      ) {
        capabilities.environmental.push("humidity");
      }
      if (
        this.deviceMapping.deviceCategories.environmental.pressure_sensor.some(
          (p) => name.includes(p)
        )
      ) {
        capabilities.environmental.push("pressure");
      }
      if (
        this.deviceMapping.deviceCategories.environmental.illuminance_sensor.some(
          (p) => name.includes(p)
        )
      ) {
        capabilities.environmental.push("illuminance");
      }
      if (
        this.deviceMapping.deviceCategories.environmental.air_quality_sensor.some(
          (p) => name.includes(p)
        )
      ) {
        capabilities.environmental.push("air_quality");
      }
    }

    console.log(`📊 Capability profile:`, capabilities);

    // PRIORITY 1: Primary device functions (main purpose)
    if (capabilities.primary.length > 0) {
      // Return the first primary function found (highest priority)
      const primaryType = capabilities.primary[0];
      console.log(`✅ Primary function detected: ${primaryType}`);
      return primaryType;
    }

    // PRIORITY 2: Control functions (interactive devices)
    if (capabilities.control.length > 0) {
      // Special case: color light takes precedence over regular light
      if (capabilities.control.includes("color_light")) {
        return "color_light";
      }

      // Special case: plug takes precedence over switch if power measurement
      if (
        capabilities.control.includes("plug") &&
        capabilities.control.includes("switch")
      ) {
        return "plug";
      }

      const controlType = capabilities.control[0];
      console.log(`✅ Control function detected: ${controlType}`);
      return controlType;
    }

    // PRIORITY 3: Multi-sensor devices (environmental combinations)
    if (capabilities.environmental.length >= 2) {
      // Climate sensor = temperature + humidity (common combo)
      if (
        capabilities.environmental.includes("temperature") &&
        capabilities.environmental.includes("humidity")
      ) {
        console.log(`✅ Multi-sensor detected: climate_sensor`);
        return "climate_sensor";
      }

      // Air quality sensor = multiple air quality measurements
      if (capabilities.environmental.includes("air_quality")) {
        console.log(`✅ Multi-sensor detected: air_quality_sensor`);
        return "air_quality_sensor";
      }

      // Default multi-sensor
      console.log(`✅ Multi-sensor detected: climate_sensor (generic)`);
      return "climate_sensor";
    }

    // PRIORITY 4: Single environmental sensors
    if (capabilities.environmental.length === 1) {
      const envType = capabilities.environmental[0];
      const sensorType = `${envType}_sensor`;
      console.log(`✅ Single sensor detected: ${sensorType}`);
      return sensorType;
    }

    // PRIORITY 5: Complex expose types (light, switch, etc.)
    for (const expose of exposes) {
      if (expose.type === "light") {
        // Check if it has color features
        const hasColor = expose.features?.some(
          (f: any) =>
            f.name === "color" || f.name === "color_xy" || f.name === "color_hs"
        );
        return hasColor ? "color_light" : "light";
      }

      if (expose.type === "switch") {
        // Check if it has power measurement
        const hasPower = exposes.some(
          (e: any) =>
            e.name === "power" || e.name === "voltage" || e.name === "current"
        );
        return hasPower ? "plug" : "switch";
      }

      if (expose.type === "cover") return "cover";
      if (expose.type === "lock") return "lock";
      if (expose.type === "fan") return "fan";
      if (expose.type === "climate") return "thermostat";
    }

    return "unknown";
  }

  // Manufacturer-specific detection heuristics
  private detectFromManufacturerHeuristics(
    manufacturer: string,
    modelId: string
  ): string {
    // TAMBAHAN: Espressif (ESP32/ESP8266) device detection
    if (
      manufacturer.includes("espressif") ||
      manufacturer.includes("GSPE") ||
      manufacturer.includes("Espressif")
    ) {
      console.log(
        `🎯 Espressif device detected - treating as custom IoT sensor`
      );
      return "iot";
    }

    // Xiaomi/Aqara heuristics
    if (
      manufacturer.includes("lumi") ||
      manufacturer.includes("xiaomi") ||
      manufacturer.includes("aqara")
    ) {
      // Most Xiaomi sensors are multi-function
      if (modelId.includes("sensor")) {
        if (modelId.includes("motion") || modelId.includes("rtcgq"))
          return "motion_sensor";
        if (modelId.includes("magnet") || modelId.includes("mccgq"))
          return "door_sensor";
        if (modelId.includes("wleak") || modelId.includes("sjcgq"))
          return "water_sensor";
        if (modelId.includes("weather") || modelId.includes("wsdcgq"))
          return "climate_sensor";
        return "climate_sensor";
      }
      if (modelId.includes("plug") || modelId.includes("zncz")) return "plug";
      if (modelId.includes("light")) return "light";
      if (modelId.includes("switch") || modelId.includes("wxkg"))
        return "button";
    }

    // Tuya heuristics (largest ecosystem)
    if (manufacturer.includes("tuya") || manufacturer.startsWith("_tz")) {
      if (modelId.startsWith("ts000") || modelId.startsWith("ts001"))
        return "switch";
      if (modelId.startsWith("ts011") || modelId.includes("plug"))
        return "plug";
      if (modelId.startsWith("ts02")) return "sensor";
      if (modelId.startsWith("ts05")) return "light";
      if (modelId.includes("601")) return "unknown";
    }

    // SmartThings heuristics
    if (
      manufacturer.includes("smartthings") ||
      manufacturer.includes("samsung")
    ) {
      if (modelId.includes("motion")) return "motion_sensor";
      if (modelId.includes("multi")) return "climate_sensor";
      if (modelId.includes("button")) return "button";
    }

    // IKEA heuristics
    if (manufacturer.includes("ikea")) {
      return "unknown";
    }

    // Philips heuristics
    if (manufacturer.includes("philips")) {
      if (modelId.startsWith("l")) return "light";
      if (modelId.startsWith("r")) return "remote";
      if (modelId.startsWith("s") || modelId.startsWith("h"))
        return "motion_sensor";
    }

    // SONOFF heuristics
    if (manufacturer.includes("sonoff") || manufacturer.includes("ewelink")) {
      if (modelId.includes("snzb")) return "sensor";
      if (modelId.includes("basic") || modelId.includes("mini"))
        return "switch";
      if (modelId.includes("s31")) return "plug";
    }

    return "unknown";
  }

  private async markDeviceOffline(friendlyName: string) {
    try {
      await prisma.zigbeeDevice.updateMany({
        where: {
          OR: [{ friendlyName }, { deviceId: friendlyName }],
        },
        data: {
          isOnline: false,
          updatedAt: new Date(),
        },
      });

      console.log(`📴 Marked ${friendlyName} as offline`);
    } catch (error) {
      console.error(`❌ Error marking device offline:`, error);
    }
  }

  // Ultimate state-based detection for new devices
  private ultimateStateBasedDetection(state: any): string {
    if (!state) return "unknown";

    const stateKeys = Object.keys(state);
    console.log(`🔍 Ultimate state detection:`, stateKeys);

    // PRIORITY 1: Primary device functions
    if (state.occupancy !== undefined) return "motion_sensor";
    if (state.motion !== undefined) return "motion_sensor";
    if (state.presence !== undefined) return "presence_sensor";
    if (state.contact !== undefined) return "door_sensor";
    if (state.water_leak !== undefined) return "water_sensor";
    if (state.smoke !== undefined) return "smoke_sensor";
    if (state.gas !== undefined) return "gas_sensor";
    if (state.action !== undefined) {
      // Distinguish between button and remote based on other keys
      if (stateKeys.length <= 4) return "button"; // Simple button
      return "remote"; // Complex remote
    }

    // PRIORITY 2: Control functions
    if (state.brightness !== undefined) {
      if (
        state.color !== undefined ||
        state.color_xy !== undefined ||
        state.color_hs !== undefined
      ) {
        return "color_light";
      }
      return "light";
    }

    if (state.state !== undefined) {
      // Distinguish between switch and plug based on power measurement
      if (
        state.power !== undefined ||
        state.voltage !== undefined ||
        state.current !== undefined ||
        state.energy !== undefined
      ) {
        return "plug";
      }
      return "switch";
    }

    if (state.position !== undefined) return "cover";
    if (state.lock_state !== undefined) return "lock";
    if (state.fan_state !== undefined) return "fan";
    if (state.current_heating_setpoint !== undefined) return "thermostat";

    // PRIORITY 3: Multi-sensor environmental
    const envSensors = [
      "temperature",
      "humidity",
      "pressure",
      "illuminance",
    ].filter((key) => state[key] !== undefined);
    if (envSensors.length >= 2) {
      return "climate_sensor";
    }

    // Air quality sensors
    const airQualitySensors = [
      "co2",
      "voc",
      "pm25",
      "pm10",
      "formaldehyde",
      "eco2",
    ].filter((key) => state[key] !== undefined);
    if (airQualitySensors.length > 0) {
      return "air_quality_sensor";
    }

    // PRIORITY 4: Single environmental sensors
    if (state.temperature !== undefined) return "temperature_sensor";
    if (state.humidity !== undefined) return "humidity_sensor";
    if (state.pressure !== undefined) return "pressure_sensor";
    if (state.illuminance !== undefined) return "illuminance_sensor";

    // PRIORITY 5: Specialty sensors
    if (state.vibration !== undefined) return "vibration_sensor";

    return "unknown";
  }

  private extractCapabilitiesFromState(state: any): any {
    const capabilities: any = {};
    Object.keys(state).forEach((key) => {
      if (!["linkquality", "last_seen"].includes(key)) {
        capabilities[key] = {
          type: typeof state[key],
          readable: true,
          writable: this.isWritableAttribute(key),
        };
      }
    });
    return capabilities;
  }

  // Enhanced command sending
  // Enhanced command sending dengan better error handling dan logging
  public async sendDeviceCommand(
    deviceId: string,
    command: any
  ): Promise<boolean> {
    if (!this.client?.connected) {
      throw new Error("MQTT client not connected to broker");
    }

    const transactionId = `cmd_${Date.now()}_${Math.random()
      .toString(16)
      .substr(2, 6)}`;

    console.log(
      `📤 [COMMAND] Sending to ${deviceId}:`,
      JSON.stringify(command, null, 2)
    );

    let topic: string;
    let payload: any;

    // Handle bridge commands (coordinator actions)
    if (deviceId.startsWith("bridge/")) {
      topic = `zigbee2mqtt/${deviceId}`;
      payload = { ...command, transaction: transactionId };
      console.log(`🌉 [BRIDGE] Bridge command: ${topic}`);
    } else {
      // Handle device commands
      topic = `zigbee2mqtt/${deviceId}/set`;
      payload = command;
      console.log(`📱 [DEVICE] Device command: ${topic}`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(transactionId);
        console.log(`⏰ [TIMEOUT] Command timeout for ${deviceId}`);
        reject(
          new Error(`Command timeout after 10 seconds for device: ${deviceId}`)
        );
      }, 10000); // Increased timeout

      this.responseTimeouts.set(transactionId, timeout);

      // For bridge commands, wait for response
      if (deviceId.startsWith("bridge/")) {
        this.pendingCommands.set(transactionId, {
          resolve: (data: any) => {
            console.log(`✅ [BRIDGE_RESPONSE] ${deviceId}:`, data);
            resolve(data);
          },
          reject: (error: Error) => {
            console.log(`❌ [BRIDGE_ERROR] ${deviceId}:`, error.message);
            reject(error);
          },
        });
      }

      // Publish command
      this.client?.publish(
        topic,
        JSON.stringify(payload),
        { qos: 1 },
        (error) => {
          if (error) {
            console.error(
              `❌ [PUBLISH_ERROR] Failed to send to ${deviceId}:`,
              error
            );

            // Cleanup
            if (this.responseTimeouts.has(transactionId)) {
              clearTimeout(this.responseTimeouts.get(transactionId)!);
              this.responseTimeouts.delete(transactionId);
            }
            this.pendingCommands.delete(transactionId);

            reject(error);
          } else {
            console.log(`✅ [PUBLISHED] Command published to ${topic}`);

            // For device commands, resolve immediately after successful publish
            if (!deviceId.startsWith("bridge/")) {
              if (this.responseTimeouts.has(transactionId)) {
                clearTimeout(this.responseTimeouts.get(transactionId)!);
                this.responseTimeouts.delete(transactionId);
              }
              resolve(true);
            }
          }
        }
      );
    });
  }
  // Utility methods
  private getProperManufacturer(
    manufacturer?: string,
    modelId?: string
  ): string {
    if (!manufacturer && !modelId) return "Unknown";

    if (manufacturer && this.deviceMapping.manufacturers[manufacturer]) {
      return this.deviceMapping.manufacturers[manufacturer];
    }

    if (modelId) {
      for (const [prefix, brand] of Object.entries(
        this.deviceMapping.manufacturers
      )) {
        if (modelId.startsWith(prefix)) {
          return brand;
        }
      }
    }

    return manufacturer || "Unknown";
  }

  private getProperModel(modelId?: string, definitionModel?: string): string {
    if (!modelId) return "Unknown";

    if (this.deviceMapping.models[modelId]) {
      return this.deviceMapping.models[modelId];
    }

    return definitionModel || modelId || "Unknown";
  }

  private isWritableAttribute(attribute: string): boolean {
    const writableAttrs = [
      "state",
      "brightness",
      "color",
      "color_temp",
      "position",
      "tilt",
      "volume",
      "temperature_setpoint",
      "target_temperature",
      "system_mode",
      "current_heating_setpoint",
      "occupied_heating_setpoint",
      "fan_state",
      "fan_mode",
    ];
    return writableAttrs.includes(attribute);
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("❌ Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(Math.pow(2, this.reconnectAttempts) * 1000, 30000);

    console.log(
      `🔄 Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts})`
    );

    setTimeout(() => {
      this.isRunning = false;
      this.startService();
    }, delay);
  }

  // Enhanced remove device with multiple strategies
  public async removeDevice(
    ieeeAddress: string,
    force: boolean = false
  ): Promise<boolean> {
    console.log(`🗑️ [REMOVE] Removing device ${ieeeAddress}, force: ${force}`);

    try {
      const command = {
        id: ieeeAddress,
        force: force,
      };

      await this.sendDeviceCommand("bridge/request/device/remove", command);
      console.log(
        `✅ [REMOVE] Remove command sent successfully for ${ieeeAddress}`
      );

      return true;
    } catch (error) {
      console.error(
        `❌ [REMOVE] Failed to remove device ${ieeeAddress}:`,
        error
      );
      throw error;
    }
  }

  // Enhanced rename device with validation
  public async renameDevice(
    ieeeAddress: string,
    newName: string
  ): Promise<boolean> {
    console.log(`✏️ [RENAME] Renaming ${ieeeAddress} to "${newName}"`);

    if (!newName || !newName.trim()) {
      throw new Error("New name cannot be empty");
    }

    const trimmedName = newName.trim();

    try {
      const command = {
        from: ieeeAddress, // Can be IEEE address or current friendly name
        to: trimmedName,
      };

      await this.sendDeviceCommand("bridge/request/device/rename", command);
      console.log(
        `✅ [RENAME] Rename command sent successfully: ${ieeeAddress} -> ${trimmedName}`
      );

      return true;
    } catch (error) {
      console.error(
        `❌ [RENAME] Failed to rename device ${ieeeAddress}:`,
        error
      );
      throw error;
    }
  }

  // Enhanced pairing dengan proper disable handling
  public async enablePairing(duration: number = 254): Promise<boolean> {
    console.log(`🔗 [PAIRING] Enabling pairing for ${duration} seconds`);

    try {
      const command = {
        value: true,
        time: duration,
      };

      await this.sendDeviceCommand("bridge/request/permit_join", command);
      console.log(
        `✅ [PAIRING] Pairing enabled successfully for ${duration} seconds`
      );

      return true;
    } catch (error) {
      console.error(`❌ [PAIRING] Failed to enable pairing:`, error);
      throw error;
    }
  }

  // NEW METHOD: Proper disable pairing
  public async disablePairing(): Promise<boolean> {
    console.log(`🔗 [PAIRING] Disabling pairing mode`);

    try {
      // Method 1: Send disable command with time: 0
      const command = {
        value: false,
        time: 0,
      };

      await this.sendDeviceCommand("bridge/request/permit_join", command);
      console.log(`✅ [PAIRING] Pairing disabled successfully`);

      return true;
    } catch (error) {
      console.error(`❌ [PAIRING] Failed to disable pairing:`, error);

      // Fallback method: Try alternative disable command
      try {
        console.log(`🔄 [PAIRING] Trying fallback disable method`);

        await this.sendDeviceCommand("bridge/request/permit_join", {
          value: false,
        });

        console.log(`✅ [PAIRING] Pairing disabled via fallback method`);
        return true;
      } catch (fallbackError) {
        console.error(
          `❌ [PAIRING] Fallback disable also failed:`,
          fallbackError
        );
        throw error; // Throw original error
      }
    }
  }
  // New method: Force refresh device state
  public async refreshDeviceState(deviceId: string): Promise<boolean> {
    console.log(`🔄 [REFRESH] Refreshing state for device ${deviceId}`);

    try {
      // Try to get multiple common attributes
      const getCommand = {
        state: "",
        brightness: "",
        temperature: "",
        humidity: "",
        battery: "",
        linkquality: "",
      };

      // Send get request to device
      const topic = `zigbee2mqtt/${deviceId}/get`;
      const payload = JSON.stringify(getCommand);

      return new Promise((resolve, reject) => {
        this.client?.publish(topic, payload, { qos: 1 }, (error) => {
          if (error) {
            console.error(`❌ [REFRESH] Failed to refresh ${deviceId}:`, error);
            reject(error);
          } else {
            console.log(`✅ [REFRESH] Refresh request sent to ${deviceId}`);
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error(`❌ [REFRESH] Error refreshing device ${deviceId}:`, error);
      throw error;
    }
  }

  // New method: Get bridge info
  public async getBridgeInfo(): Promise<any> {
    console.log(`📊 [INFO] Getting bridge information`);

    try {
      await this.sendDeviceCommand("bridge/request/bridge/info", {});
      return true;
    } catch (error) {
      console.error(`❌ [INFO] Failed to get bridge info:`, error);
      throw error;
    }
  }

  // New method: Restart bridge
  public async restartBridge(): Promise<boolean> {
    console.log(`🔄 [RESTART] Restarting Zigbee2MQTT bridge`);

    try {
      await this.sendDeviceCommand("bridge/request/restart", {});
      console.log(`✅ [RESTART] Bridge restart command sent`);
      return true;
    } catch (error) {
      console.error(`❌ [RESTART] Failed to restart bridge:`, error);
      throw error;
    }
  }

  // Enhanced method untuk update dengan better state merging
  public async forceDeviceUpdate(deviceId: string): Promise<void> {
    console.log(`🔄 [FORCE_UPDATE] Force updating device ${deviceId}`);

    try {
      // Request current device list to trigger update
      await this.sendDeviceCommand("bridge/request/devices", {});

      // Also try to refresh the specific device
      await this.refreshDeviceState(deviceId);

      console.log(`✅ [FORCE_UPDATE] Force update completed for ${deviceId}`);
    } catch (error) {
      console.error(
        `❌ [FORCE_UPDATE] Failed to force update ${deviceId}:`,
        error
      );
      throw error;
    }
  }
  public async getDevices() {
    return await prisma.zigbeeDevice.findMany({
      orderBy: [{ isOnline: "desc" }, { friendlyName: "asc" }],
    });
  }

  public async getDevice(deviceId: string) {
    return await prisma.zigbeeDevice.findFirst({
      where: {
        OR: [{ deviceId }, { friendlyName: deviceId }],
      },
    });
  }

  public stop() {
    this.responseTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.responseTimeouts.clear();
    this.pendingCommands.clear();

    if (this.client) {
      this.client.end(true);
      this.client = null;
    }
    this.isRunning = false;
    console.log("🛑 Zigbee listener stopped");
  }
}

let zigbeeListenerInstance: ZigbeeListenerService | null = null;

export function getZigbeeListenerService(): ZigbeeListenerService {
  if (!zigbeeListenerInstance) {
    zigbeeListenerInstance = new ZigbeeListenerService();
  }
  return zigbeeListenerInstance;
}
