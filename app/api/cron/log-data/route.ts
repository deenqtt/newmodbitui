// File: app/api/cron/log-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Paho from "paho-mqtt";

const prisma = new PrismaClient();

// ✅ GLOBAL MQTT CLIENT (Truly Persistent)
let globalMqttClient: Paho.Client | null = null;
let latestPayloadsCache: Record<string, any> = {};
let subscribedTopics = new Set<string>();
let isConnecting = false;
let isConnected = false;
let connectionPromise: Promise<void> | null = null;

function getMQTTHost(): string {
  if (process.env.NEXT_PUBLIC_MQTT_HOST) {
    return process.env.NEXT_PUBLIC_MQTT_HOST;
  }
  return "localhost";
}

/**
 * ✅ Initialize persistent MQTT connection (called once and kept alive)
 */
async function ensureMqttConnection(requiredTopics: string[]): Promise<void> {
  // ✅ If already connected, just subscribe to new topics if needed
  if (isConnected && globalMqttClient) {
    const missingTopics = requiredTopics.filter(
      (t) => !subscribedTopics.has(t)
    );

    if (missingTopics.length > 0) {
      console.log(
        `[MQTT] 📡 Subscribing to ${missingTopics.length} new topic(s)...`
      );
      missingTopics.forEach((topic) => {
        try {
          globalMqttClient!.subscribe(topic);
          subscribedTopics.add(topic);
          console.log(`[MQTT] ✅ Subscribed: ${topic}`);
        } catch (error) {
          console.error(`[MQTT] ❌ Failed to subscribe to ${topic}:`, error);
        }
      });
    } else {
      console.log(
        `[MQTT] ♻️  Reusing existing connection (${subscribedTopics.size} topics)`
      );
    }

    return; // ✅ Connection already active, return immediately
  }

  // ✅ If currently connecting, wait for existing connection attempt
  if (isConnecting && connectionPromise) {
    console.log("[MQTT] ⏳ Connection in progress, waiting...");
    await connectionPromise;
    return;
  }

  // ✅ Start new connection
  isConnecting = true;

  connectionPromise = new Promise<void>(async (resolve, reject) => {
    console.log("[MQTT] 🔌 Initializing persistent MQTT connection...");

    try {
      globalMqttClient = new Paho.Client(
        getMQTTHost(),
        parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || "9000"),
        `cron-logger-persistent-${Date.now()}`
      );

      // ✅ Message handler - updates cache automatically
      globalMqttClient.onMessageArrived = (message) => {
        try {
          const payload = JSON.parse(message.payloadString);
          latestPayloadsCache[message.destinationName] = payload;

          const cacheSize = Object.keys(latestPayloadsCache).length;
          console.log(
            `[MQTT] 📥 Cached payload: ${message.destinationName} (${cacheSize} total)`
          );
        } catch (e) {
          console.error(
            `[MQTT] ❌ Failed to parse payload from ${message.destinationName}`
          );
        }
      };

      // ✅ Connection lost handler - auto-reconnect
      globalMqttClient.onConnectionLost = (responseObject) => {
        isConnected = false;
        isConnecting = false;
        connectionPromise = null;

        console.error(
          "[MQTT] ⚠️  Connection lost:",
          responseObject.errorMessage
        );
        console.log(
          "[MQTT] 🔄 Connection will be re-established on next request"
        );

        globalMqttClient = null;
        subscribedTopics.clear();
      };

      // ✅ Connect to MQTT broker
      globalMqttClient.connect({
        onSuccess: () => {
          isConnected = true;
          isConnecting = false;

          console.log("[MQTT] ✅ Connected to MQTT broker (PERSISTENT)");

          // Subscribe to all required topics
          let subscribeErrors = 0;
          requiredTopics.forEach((topic) => {
            try {
              globalMqttClient!.subscribe(topic);
              subscribedTopics.add(topic);
              console.log(`[MQTT] 📡 Subscribed: ${topic}`);
            } catch (error) {
              subscribeErrors++;
              console.error(
                `[MQTT] ❌ Failed to subscribe to ${topic}:`,
                error
              );
            }
          });

          console.log(
            `[MQTT] 🎉 Ready! Subscribed to ${
              requiredTopics.length - subscribeErrors
            }/${requiredTopics.length} topic(s)`
          );

          // ✅ Wait briefly for initial payload (only on first connect)
          setTimeout(() => {
            const cacheSize = Object.keys(latestPayloadsCache).length;
            console.log(`[MQTT] 💾 Cache ready with ${cacheSize} payload(s)`);
            resolve();
          }, 1500); // Reduced to 1.5 seconds
        },
        onFailure: (err) => {
          isConnecting = false;
          isConnected = false;
          connectionPromise = null;

          console.error("[MQTT] ❌ Failed to connect:", err.errorMessage);
          reject(new Error(err.errorMessage));
        },
        useSSL: false,
        keepAliveInterval: 60, // Keep connection alive
        cleanSession: false, // Preserve subscriptions
        reconnect: false, // We handle reconnect manually
      });
    } catch (error) {
      isConnecting = false;
      isConnected = false;
      connectionPromise = null;
      reject(error);
    }
  });

  await connectionPromise;
}

/**
 * ✅ Main GET handler
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Get parameters from query
  const searchParams = request.nextUrl.searchParams;
  const intervalParam = searchParams.get("interval");
  const configIdParam = searchParams.get("configId");

  const interval = intervalParam ? parseInt(intervalParam) : null;

  // Build where clause
  let whereClause: any = {};

  if (configIdParam) {
    whereClause = { id: configIdParam };
  } else if (interval) {
    whereClause = { loggingIntervalMinutes: interval };
  }

  // Fetch configs from database
  const configs = await prisma.loggingConfiguration.findMany({
    where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
    include: { device: true },
  });

  if (configs.length === 0) {
    return NextResponse.json({
      message: configIdParam
        ? `Config ${configIdParam} not found`
        : interval
        ? `No configs for ${interval} minute interval`
        : "No configs found",
      logged: 0,
    });
  }

  console.log(
    `\n[CRON] 🚀 Processing ${configs.length} config(s)${
      configIdParam
        ? ` (${configs[0].customName})`
        : interval
        ? ` for ${interval}min interval`
        : ""
    }...`
  );

  // Get unique topics
  const topics = [...new Set(configs.map((c) => c.device.topic))];

  // ✅ Ensure MQTT connection (persistent)
  try {
    await ensureMqttConnection(topics);
  } catch (error: any) {
    console.error(`[MQTT] ❌ Connection error:`, error.message);
    return NextResponse.json(
      { message: `Failed to connect to MQTT: ${error.message}`, logged: 0 },
      { status: 500 }
    );
  }

  // ✅ Small delay to ensure we have fresh data (only if cache is empty)
  const hasAllPayloads = topics.every((topic) => latestPayloadsCache[topic]);

  if (!hasAllPayloads) {
    console.log("[MQTT] ⏳ Waiting briefly for fresh payloads...");
    await new Promise((resolve) => setTimeout(resolve, 500)); // Just 500ms!
  }

  // ✅ Get payloads from cache (INSTANT!)
  const logEntries = [];

  for (const config of configs) {
    const topic = config.device.topic;
    const payload = latestPayloadsCache[topic];

    if (!payload) {
      console.warn(
        `[CRON] ⚠️  No cached payload for topic ${topic} (Config: ${config.customName})`
      );
      continue;
    }

    if (typeof payload.value !== "string") {
      console.warn(`[CRON] ⚠️  Invalid payload structure for topic ${topic}`);
      continue;
    }

    try {
      const innerValue = JSON.parse(payload.value);
      const valueToLog = innerValue[config.key];

      if (valueToLog !== undefined && !isNaN(parseFloat(valueToLog))) {
        let finalValue = parseFloat(valueToLog);
        if (config.multiply) {
          finalValue *= config.multiply;
        }

        logEntries.push({
          configId: config.id,
          value: finalValue,
        });

        console.log(
          `[CRON] ✅ Logged ${config.customName}: ${finalValue} ${
            config.units || ""
          }`
        );
      } else {
        console.warn(
          `[CRON] ⚠️  Key "${config.key}" not found or invalid in payload for ${topic}`
        );
      }
    } catch (e) {
      console.error(
        `[CRON] ❌ Failed to process payload for "${config.customName}":`,
        e
      );
    }
  }

  // Save to database with retry
  let savedCount = 0;

  if (logEntries.length > 0) {
    try {
      // Re-fetch configs to verify they still exist
      const configIds = logEntries.map((entry) => entry.configId);
      const existingConfigs = await prisma.loggingConfiguration.findMany({
        where: { id: { in: configIds } },
        select: { id: true },
      });

      const existingConfigIds = new Set(existingConfigs.map((c) => c.id));

      // Filter out entries for deleted configs
      const validLogEntries = logEntries.filter((entry) =>
        existingConfigIds.has(entry.configId)
      );

      const skippedCount = logEntries.length - validLogEntries.length;

      if (skippedCount > 0) {
        console.warn(
          `[CRON] ⚠️  Skipped ${skippedCount} log entries (configs deleted)`
        );
      }

      if (validLogEntries.length > 0) {
        await prisma.loggedData.createMany({ data: validLogEntries });
        savedCount = validLogEntries.length;
        console.log(`[CRON] 💾 Saved ${savedCount} log entry(ies) to database`);
      } else {
        console.log(
          "[CRON] ⚠️  No valid log entries to save (all configs deleted)"
        );
      }
    } catch (error) {
      console.error("[CRON] ❌ Error saving log entries:", error);
      return NextResponse.json(
        { message: "Error saving log entries", logged: 0 },
        { status: 500 }
      );
    }
  } else {
    console.log("[CRON] ⚠️  No log entries to save");
  }

  const duration = Date.now() - startTime;
  console.log(`[CRON] ⚡ Completed in ${duration}ms (${savedCount} logged)\n`);

  return NextResponse.json({
    message: "Cron job finished",
    interval: interval || "single",
    configs: configs.length,
    logged: savedCount,
    durationMs: duration,
    mqttConnected: isConnected,
    cacheSize: Object.keys(latestPayloadsCache).length,
  });
}
