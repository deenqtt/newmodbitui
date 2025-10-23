// File: lib/services/thermal-listener.ts (Updated with dynamic host)
import { PrismaClient } from "@prisma/client";
import mqtt from "mqtt";

// Import MQTT config from unified configuration
import { getMQTTFullConfig, MQTTConfig } from "@/lib/mqtt-config";

// Configuration
const MQTT_CONFIG: MQTTConfig = getMQTTFullConfig();
const AUTO_DISCOVERY = process.env.THERMAL_AUTO_DISCOVERY !== "false"; // Default true

// Global variables
let mqttClient: mqtt.MqttClient | null = null;
const prisma = new PrismaClient();
const thermalDataCache = new Map<string, any>();
const subscribedTopics = new Set<string>();

interface ThermalPayload {
  timestamp: string;
  device_id: string;
  device_name: string;
  location: string;
  interface: string;
  thermal_data: {
    raw_array: number[];
    statistics: {
      min_temp: number;
      max_temp: number;
      avg_temp: number;
      median_temp: number;
      std_temp: number;
      shape: number[];
      total_pixels: number;
    };
    frame_count: number;
    cycle: number;
    total_frames: number;
  };
  metadata: {
    sensor_type: string;
    resolution: string;
    units: string;
  };
}

interface ActiveDevice {
  deviceId: string;
  deviceName: string;
  topic: string;
  lastSeen: Date;
  isActive: boolean;
  interface?: string;
  location?: string;
}

export function getThermalListenerService() {
  if (mqttClient && mqttClient.connected) {
    return;
  }

  // Setup connection options with authentication if available
  const connectionOptions: mqtt.IClientOptions = {
    clientId: `thermal_listener_${Date.now()}`,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
  };

  // Add authentication if available
  if (MQTT_CONFIG.username) {
    connectionOptions.username = MQTT_CONFIG.username;
    connectionOptions.password = MQTT_CONFIG.password;
  }

  mqttClient = mqtt.connect(MQTT_CONFIG.brokerUrl, connectionOptions);

  mqttClient.on("connect", async () => {
    // Step 1: Subscribe to all registered thermal devices
    await subscribeToRegisteredDevices();

    // Step 2: Setup auto-discovery if enabled
    if (AUTO_DISCOVERY) {
      await setupAutoDiscovery();
    } else {
      console.log(
        "Auto-discovery disabled - only listening to registered devices"
      );
    }

    // Step 3: Start cleanup service
    startCleanupService();
  });

  mqttClient.on("message", async (topic, payload) => {
    try {
      const data = JSON.parse(payload.toString());

      if (validateThermalData(data)) {
        await processThermalMessage(data, topic);
      }
    } catch (error) {
      // Silently ignore non-JSON or invalid messages
      return;
    }
  });

  mqttClient.on("error", (err) => {
    console.error(`MQTT thermal listener error (${MQTT_CONFIG.brokerUrl}):`, err);
  });

  mqttClient.on("close", () => {
    console.log(`MQTT thermal listener disconnected from: ${MQTT_CONFIG.brokerUrl}`);
  });

  mqttClient.on("reconnect", () => {
    console.log(`MQTT thermal listener reconnecting to: ${MQTT_CONFIG.brokerUrl}...`);
  });

  mqttClient.on("offline", () => {
    console.log(`MQTT thermal listener offline from: ${MQTT_CONFIG.brokerUrl}`);
  });
}

// Subscribe to all registered thermal devices from database
async function subscribeToRegisteredDevices() {
  try {
    const thermalDevices = await prisma.deviceExternal.findMany({
      where: {
        OR: [
          { topic: { contains: "thermal" } },
          { name: { contains: "Thermal" } },
          { name: { contains: "thermal" } },
        ],
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (thermalDevices.length === 0) {
      console.log("No registered thermal devices found in database");
      return;
    }

    for (const device of thermalDevices) {
      await subscribeToTopic(device.topic, `registered device: ${device.name}`);
    }
  } catch (error) {
    console.error("Error loading registered thermal devices:", error);
  }
}

// Setup auto-discovery patterns
async function setupAutoDiscovery() {
  console.log("Setting up auto-discovery patterns...");

  const discoveryPatterns = [
    "sensors/thermal_stream/+", // Local pattern from publisher
    "+/thermal/+/data", // Generic thermal pattern
    "factory/+/thermal/data", // Factory pattern
    "warehouse/+/thermal/data", // Warehouse pattern
    "sensors/+/+/data", // Fixed: was sensors/+/thermal_cam_+/data
  ];

  for (const pattern of discoveryPatterns) {
    mqttClient?.subscribe(pattern, { qos: 1 }, (err) => {
      if (!err) {
        console.log(`Auto-discovery pattern subscribed: ${pattern}`);
      } else {
        console.error(`Failed to subscribe to pattern ${pattern}:`, err);
      }
    });
  }
}

// Helper function to subscribe to a topic
async function subscribeToTopic(topic: string, description: string) {
  if (subscribedTopics.has(topic)) {
    console.log(`Already subscribed to: ${topic}`);
    return;
  }

  mqttClient?.subscribe(topic, { qos: 1 }, (err) => {
    if (!err) {
      subscribedTopics.add(topic);
    } else {
      console.error(`Failed to subscribe to ${topic}:`, err);
    }
  });
}

// Process incoming thermal message
async function processThermalMessage(
  thermalData: ThermalPayload,
  topic: string
) {
  try {
    // Check if device exists in database
    let device = await prisma.deviceExternal.findFirst({
      where: { topic: topic },
    });

    // Auto-register device if not exists and auto-discovery enabled
    if (!device) {
      if (AUTO_DISCOVERY || topic.startsWith("sensors/thermal_stream/")) {
        device = await autoRegisterDevice(thermalData, topic);
        if (device) {
          // Subscribe to this topic for future messages
          await subscribeToTopic(
            topic,
            `auto-registered device: ${device.name}`
          );
        }
      } else {
        return;
      }
    }

    if (!device) {
      console.warn(
        `Could not process thermal data - device not found for topic: ${topic}`
      );
      return;
    }

    // Update cache with latest data
    const cacheKey = thermalData.device_id;
    thermalDataCache.set(cacheKey, {
      ...thermalData,
      receivedAt: new Date(),
      topic: topic,
      deviceDbId: device.id,
    });

    // Save to database
    await saveThermalData(thermalData, device);
  } catch (error) {
    console.error("Error processing thermal message:", error);
  }
}

// Auto-register new thermal device
async function autoRegisterDevice(thermalData: ThermalPayload, topic: string) {
  try {
    const device = await prisma.deviceExternal.create({
      data: {
        name: thermalData.device_name || `Thermal ${thermalData.device_id}`,
        topic: topic,
        address: thermalData.device_id,
        lastPayload: JSON.stringify(thermalData),
        lastUpdatedByMqtt: new Date(),
      },
    });

    return device;
  } catch (error) {
    console.error("Error auto-registering thermal device:", error);
    return null;
  }
}

// Save thermal data to database
async function saveThermalData(thermalData: ThermalPayload, device: any) {
  try {
    // Update device with latest payload and timestamp
    await prisma.deviceExternal.update({
      where: { id: device.id },
      data: {
        lastPayload: JSON.stringify(thermalData),
        lastUpdatedByMqtt: new Date(),
      },
    });

    // Save thermal data to ThermalData table (every 60th frame to reduce load)
    const frameCount = thermalData.thermal_data.frame_count || 0;
    if (frameCount % 60 === 0) {
      await prisma.thermalData.create({
        data: {
          deviceId: device.id,
          minTemp: thermalData.thermal_data.statistics.min_temp,
          maxTemp: thermalData.thermal_data.statistics.max_temp,
          avgTemp: thermalData.thermal_data.statistics.avg_temp,
          frameCount: frameCount,
        },
      });
    }
  } catch (error) {
    console.error("Error saving thermal data to database:", error);
  }
}

// Validate thermal data structure
function validateThermalData(data: any): data is ThermalPayload {
  return (
    data &&
    typeof data.device_id === "string" &&
    typeof data.device_name === "string" &&
    data.thermal_data &&
    Array.isArray(data.thermal_data.raw_array) &&
    data.thermal_data.raw_array.length > 0 &&
    data.thermal_data.statistics &&
    typeof data.thermal_data.statistics.min_temp === "number" &&
    typeof data.thermal_data.statistics.max_temp === "number" &&
    typeof data.thermal_data.statistics.avg_temp === "number" &&
    data.metadata &&
    typeof data.metadata.resolution === "string"
  );
}

// Cleanup service
async function cleanupThermalData() {
  try {
    // Delete thermal data older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const deleted = await prisma.thermalData.deleteMany({
      where: {
        timestamp: {
          lt: twentyFourHoursAgo,
        },
      },
    });

    if (deleted.count > 0) {
      console.log(`Cleaned up ${deleted.count} old thermal records`);
    }

    // Clean up cache for devices offline > 2 minutes
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    let removedFromCache = 0;

    for (const [deviceId, data] of thermalDataCache.entries()) {
      if (data.receivedAt.getTime() < twoMinutesAgo) {
        thermalDataCache.delete(deviceId);
        removedFromCache++;
      }
    }

    if (removedFromCache > 0) {
      console.log(`Removed ${removedFromCache} offline devices from cache`);
    }
  } catch (error) {
    console.error("Error during thermal cleanup:", error);
  }
}

function startCleanupService() {
  // Initial cleanup after 30 seconds
  setTimeout(() => {
    cleanupThermalData();
  }, 30000);

  // Regular cleanup every 30 minutes
  setInterval(() => {
    cleanupThermalData();
  }, 30 * 60 * 1000);
}

// === PUBLIC API FUNCTIONS ===

// Get thermal data for specific device
export function getThermalDataByDevice(deviceId: string) {
  return thermalDataCache.get(deviceId) || null;
}

// Get all currently active thermal devices
export function getAllActiveThermalDevices(): ActiveDevice[] {
  const devices: ActiveDevice[] = [];
  const now = Date.now();

  for (const [deviceId, data] of thermalDataCache.entries()) {
    const timeDiff = now - data.receivedAt.getTime();
    if (timeDiff < 60000) {
      // Active in last 60 seconds
      devices.push({
        deviceId,
        deviceName: data.device_name,
        topic: data.topic,
        lastSeen: data.receivedAt,
        isActive: timeDiff < 30000, // Active if seen in last 30 seconds
        interface: data.interface,
        location: data.location,
      });
    }
  }

  return devices.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
}

// Get current thermal data (backward compatibility)
export function getCurrentThermalData() {
  const activeDevices = getAllActiveThermalDevices();
  if (activeDevices.length > 0) {
    return getThermalDataByDevice(activeDevices[0].deviceId);
  }
  return null;
}

// Get thermal data cache
export function getThermalDataCache() {
  return thermalDataCache;
}

// Get connection status
export function getThermalListenerStatus() {
  return {
    connected: mqttClient?.connected || false,
    brokerUrl: MQTT_CONFIG.brokerUrl,
    username: MQTT_CONFIG.username || null,
    subscribedTopics: Array.from(subscribedTopics),
    cachedDevices: thermalDataCache.size,
    autoDiscovery: AUTO_DISCOVERY,
  };
}

// Manual device registration
export async function registerThermalDevice(
  name: string,
  topic: string,
  deviceId?: string
) {
  try {
    const device = await prisma.deviceExternal.create({
      data: {
        name,
        topic,
        address: deviceId || topic.split("/").pop() || "unknown",
      },
    });

    // Subscribe to the new topic
    await subscribeToTopic(topic, `manually registered device: ${name}`);

    return device;
  } catch (error) {
    console.error("Error manually registering thermal device:", error);
    throw error;
  }
}

// Cleanup and disconnect
export function cleanupThermalListener() {
  if (mqttClient) {
    mqttClient.end();
    mqttClient = null;
  }

  thermalDataCache.clear();
  subscribedTopics.clear();
}
