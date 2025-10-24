// File: app/api/cron/log-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Paho from "paho-mqtt";

// ✅ GLOBAL MQTT CLIENT (Truly Persistent with Auto-Reconnect)
let globalMqttClient: Paho.Client | null = null;
let latestPayloadsCache: Record<string, any> = {};
let subscribedTopics = new Set<string>();
let isConnecting = false;
let isConnected = false;
let connectionPromise: Promise<void> | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;

function getMQTTHost(): string {
  if (process.env.NEXT_PUBLIC_MQTT_HOST) {
    return process.env.NEXT_PUBLIC_MQTT_HOST;
  }
  return "localhost";
}

/**
 * ✅ Auto-reconnect function
 */
async function attemptReconnect(requiredTopics: string[]): Promise<void> {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Max 30s
  reconnectAttempts++;

  console.log(
    `[MQTT] 🔄 Attempting reconnect in ${delay / 1000}s (attempt ${reconnectAttempts})...`
  );

  reconnectTimer = setTimeout(async () => {
    try {
      await ensureMqttConnection(requiredTopics, true);
      reconnectAttempts = 0; // Reset on successful reconnect
    } catch (error) {
      console.error("[MQTT] ❌ Reconnect failed:", error);
      // Will retry again via onConnectionLost
    }
  }, delay);
}

/**
 * ✅ Initialize persistent MQTT connection with auto-reconnect
 */
async function ensureMqttConnection(
  requiredTopics: string[],
  isReconnect: boolean = false
): Promise<void> {
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
  if (isConnecting && connectionPromise && !isReconnect) {
    console.log("[MQTT] ⏳ Connection in progress, waiting...");
    await connectionPromise;
    return;
  }

  // ✅ Start new connection
  isConnecting = true;

  connectionPromise = new Promise<void>(async (resolve, reject) => {
    console.log(
      `[MQTT] 🔌 ${isReconnect ? "Reconnecting" : "Initializing"} persistent MQTT connection...`
    );

    try {
      // Store topics for reconnect
      const topicsToResubscribe = Array.from(subscribedTopics);

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

          // Simplified cache logging
          console.log(`[MQTT] 📥 Update: ${message.destinationName}`);
        } catch (e) {
          console.error(
            `[MQTT] ❌ Failed to parse payload from ${message.destinationName}`
          );
        }
      };

      // ✅ Connection lost handler with auto-reconnect
      globalMqttClient.onConnectionLost = (responseObject) => {
        isConnected = false;
        isConnecting = false;
        connectionPromise = null;

        console.error(
          "[MQTT] ⚠️  Connection lost:",
          responseObject.errorMessage
        );

        // DON'T clear cache - keep last known values
        // DON'T null the client yet - we'll reconnect

        // Store current subscribed topics for resubscribe
        const topicsToRestore = Array.from(subscribedTopics);

        console.log(
          `[MQTT] 🔄 Auto-reconnecting... (${topicsToRestore.length} topics to restore)`
        );

        // Attempt to reconnect
        attemptReconnect(topicsToRestore);
      };

      // ✅ Connect to MQTT broker
      globalMqttClient.connect({
        onSuccess: () => {
          isConnected = true;
          isConnecting = false;
          reconnectAttempts = 0; // Reset reconnect counter

          console.log(
            `[MQTT] ✅ ${isReconnect ? "Reconnected" : "Connected"} to MQTT broker (PERSISTENT)`
          );

          // Clear old subscriptions set and resubscribe
          subscribedTopics.clear();

          // Combine requiredTopics with previously subscribed topics
          const allTopics = [
            ...new Set([...requiredTopics, ...topicsToResubscribe]),
          ];

          let subscribeErrors = 0;
          allTopics.forEach((topic) => {
            try {
              globalMqttClient!.subscribe(topic);
              subscribedTopics.add(topic);
              console.log(`[MQTT] 📡 Subscribed: ${topic}`);
            } catch (error) {
              subscribeErrors++;
              console.error(`[MQTT] ❌ Failed to subscribe to ${topic}:`, error);
            }
          });

          console.log(
            `[MQTT] 🎉 Ready! Subscribed to ${allTopics.length - subscribeErrors}/${allTopics.length} topic(s)`
          );

          // ✅ Wait briefly for initial payload
          setTimeout(() => {
            const cacheSize = Object.keys(latestPayloadsCache).length;
            console.log(`[MQTT] 💾 Cache ready with ${cacheSize} payload(s)`);
            resolve();
          }, isReconnect ? 500 : 1500); // Shorter wait on reconnect
        },
        onFailure: (err) => {
          isConnecting = false;
          isConnected = false;
          connectionPromise = null;

          console.error("[MQTT] ❌ Failed to connect:", err.errorMessage);

          if (isReconnect) {
            // Retry reconnect with backoff
            const topicsToRetry = Array.from(subscribedTopics);
            attemptReconnect(topicsToRetry);
            resolve(); // Don't block the request
          } else {
            reject(new Error(err.errorMessage));
          }
        },
        useSSL: false,
        keepAliveInterval: 30, // Reduced from 60 to 30 seconds
        timeout: 10, // Connection timeout
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

  // ✅ Wait for fresh data with proper timeout
  const hasAllPayloads = topics.every((topic) => latestPayloadsCache[topic]);

  if (!hasAllPayloads) {
    console.log("[MQTT] ⏳ Waiting for fresh payloads...");

    // Wait up to 3 seconds for payloads to arrive
    const waitStart = Date.now();
    const maxWait = 3000;

    while (Date.now() - waitStart < maxWait) {
      const allReceived = topics.every((topic) => latestPayloadsCache[topic]);
      if (allReceived) {
        console.log(`[MQTT] ✅ All payloads received in ${Date.now() - waitStart}ms`);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 200)); // Check every 200ms
    }

    const finalCheck = topics.filter((topic) => !latestPayloadsCache[topic]);
    if (finalCheck.length > 0) {
      console.warn(`[MQTT] ⚠️  Still missing payloads for: ${finalCheck.join(", ")}`);
    }
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
