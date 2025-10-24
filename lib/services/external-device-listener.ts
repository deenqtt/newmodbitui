// External Device MQTT Listener Service
import { PrismaClient } from "@prisma/client";
import mqtt from "mqtt";

// Import MQTT config from unified configuration
import { getMQTTFullConfig, getMTTQConfigSync, MQTTConfig } from "@/lib/mqtt-config";

// Configuration - using sync version for compatibility with existing code
const MQTT_CONFIG: MQTTConfig = getMTTQConfigSync();

// Global variables
let mqttClient: mqtt.MqttClient | null = null;
const prisma = new PrismaClient();
const subscribedTopics = new Set<string>();

// Cache for mapping topics to devices
const topicDeviceMap = new Map<string, any>();

export function getExternalDeviceListenerService() {
  if (mqttClient && mqttClient.connected) {
    return;
  }

  // Setup connection options with authentication if available
  const connectionOptions: mqtt.IClientOptions = {
    clientId: `external_device_listener_${Date.now()}`,
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
    console.log(`📡 External device MQTT listener connected to: ${MQTT_CONFIG.brokerUrl}`);

    // Subscribe to all registered external devices
    await subscribeToRegisteredDevices();
  });

  mqttClient.on("message", async (topic, payload) => {
    try {
      await processExternalMessage(topic, payload);
    } catch (error) {
      console.error("Error processing external message:", error);
    }
  });

  mqttClient.on("error", (err) => {
    console.error(`MQTT external device listener error (${MQTT_CONFIG.brokerUrl}):`, err);
  });

  mqttClient.on("close", () => {
    console.log(`MQTT external device listener disconnected from: ${MQTT_CONFIG.brokerUrl}`);
  });

  mqttClient.on("reconnect", () => {
    console.log(`MQTT external device listener reconnecting to: ${MQTT_CONFIG.brokerUrl}...`);
  });

  mqttClient.on("offline", () => {
    console.log(`MQTT external device listener offline from: ${MQTT_CONFIG.brokerUrl}`);
  });
}

// Subscribe to all registered external devices from database
async function subscribeToRegisteredDevices() {
  try {
    const externalDevices = await prisma.deviceExternal.findMany({
      where: {
        topic: {
          not: "",
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (externalDevices.length === 0) {
      console.log("No external devices found in database");
      return;
    }

    console.log(`Found ${externalDevices.length} external devices to subscribe to`);

    for (const device of externalDevices) {
      await subscribeToTopic(device.topic);

      // Cache the device mapping
      topicDeviceMap.set(device.topic, device);
    }
  } catch (error) {
    console.error("Error loading external devices:", error);
  }
}

// Helper function to subscribe to a topic
async function subscribeToTopic(topic: string) {
  if (subscribedTopics.has(topic)) {
    return;
  }

  mqttClient?.subscribe(topic, { qos: 1 }, (err) => {
    if (!err) {
      subscribedTopics.add(topic);
      console.log(`✅ Subscribed to external device topic: ${topic}`);
    } else {
      console.error(`❌ Failed to subscribe to external topic ${topic}:`, err);
    }
  });
}

// Process incoming external device message
async function processExternalMessage(topic: string, payload: Buffer) {
  try {
    // Get device from cache
    let device = topicDeviceMap.get(topic);

    // If not in cache, look it up
    if (!device) {
      device = await prisma.deviceExternal.findFirst({
        where: { topic: topic },
      });

      if (device) {
        topicDeviceMap.set(topic, device);
      }
    }

    if (!device) {
      console.warn(`External device not found for topic: ${topic}`);
      return;
    }

    // Parse payload
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(payload.toString());
    } catch (parseError) {
      console.warn(`Failed to parse payload for topic ${topic}: ${payload.toString()}`);
      // Store raw payload as string in JSON format
      parsedPayload = { raw_payload: payload.toString() };
    }

    // Update device with latest payload and timestamp
    await prisma.deviceExternal.update({
      where: { id: device.id },
      data: {
        lastPayload: parsedPayload,
        lastUpdatedByMqtt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`📥 External device ${device.name} (${topic}) updated`);
  } catch (error) {
    console.error("Error processing external message:", error);
  }
}

// Add or update a device subscription dynamically
export async function addExternalDeviceSubscription(topic: string) {
  const device = await prisma.deviceExternal.findFirst({
    where: { topic: topic },
  });

  if (device) {
    await subscribeToTopic(topic);
    topicDeviceMap.set(topic, device);
    return true;
  }

  return false;
}

// Remove a device subscription
export async function removeExternalDeviceSubscription(topic: string) {
  if (subscribedTopics.has(topic)) {
    mqttClient?.unsubscribe(topic, (err) => {
      if (!err) {
        subscribedTopics.delete(topic);
        topicDeviceMap.delete(topic);
        console.log(`🗑️ Unsubscribed from external device topic: ${topic}`);
      }
    });
    return true;
  }

  return false;
}

// Get connection status
export function getExternalDeviceListenerStatus() {
  return {
    connected: mqttClient?.connected || false,
    brokerUrl: MQTT_CONFIG.brokerUrl,
    username: MQTT_CONFIG.username || null,
    subscribedTopics: Array.from(subscribedTopics),
    cachedDevices: topicDeviceMap.size,
  };
}

// Manually register external device
export async function registerExternalDevice(
  name: string,
  topic: string,
  address?: string
) {
  try {
    const device = await prisma.deviceExternal.create({
      data: {
        name,
        topic,
        address: address || topic.split("/").pop() || "unknown",
      },
    });

    // Subscribe to the new topic
    await addExternalDeviceSubscription(topic);

    return device;
  } catch (error) {
    console.error("Error manually registering external device:", error);
    throw error;
  }
}

// Cleanup and disconnect
export function cleanupExternalDeviceListener() {
  if (mqttClient) {
    mqttClient.end();
    mqttClient = null;
  }

  topicDeviceMap.clear();
  subscribedTopics.clear();
}
