// File: app/api/cron/bill-logger/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Paho from "paho-mqtt";

export const dynamic = "force-dynamic";

// ✅ GLOBAL MQTT CLIENT (Persistent seperti log-data)
let globalBillMqttClient: Paho.Client | null = null;
let billPayloadsCache: Record<string, any> = {};
let subscribedBillTopics = new Set<string>();
let isBillConnecting = false;
let isBillConnected = false;
let billConnectionPromise: Promise<void> | null = null;

function getMQTTHost(): string {
  if (process.env.NEXT_PUBLIC_MQTT_HOST) {
    return process.env.NEXT_PUBLIC_MQTT_HOST;
  }
  return "localhost";
}

/**
 * ✅ Ensure persistent MQTT connection for billing
 */
async function ensureBillMqttConnection(
  requiredTopics: string[]
): Promise<void> {
  // Already connected, just subscribe to new topics
  if (isBillConnected && globalBillMqttClient) {
    const missingTopics = requiredTopics.filter(
      (t) => !subscribedBillTopics.has(t)
    );

    if (missingTopics.length > 0) {
      console.log(
        `[BILL-MQTT] 📡 Subscribing to ${missingTopics.length} new topic(s)...`
      );
      missingTopics.forEach((topic) => {
        try {
          globalBillMqttClient!.subscribe(topic);
          subscribedBillTopics.add(topic);
          console.log(`[BILL-MQTT] ✅ Subscribed: ${topic}`);
        } catch (error) {
          console.error(
            `[BILL-MQTT] ❌ Failed to subscribe to ${topic}:`,
            error
          );
        }
      });
    } else {
      console.log(
        `[BILL-MQTT] ♻️  Reusing connection (${subscribedBillTopics.size} topics)`
      );
    }
    return;
  }

  // Wait for existing connection attempt
  if (isBillConnecting && billConnectionPromise) {
    console.log("[BILL-MQTT] ⏳ Connection in progress, waiting...");
    await billConnectionPromise;
    return;
  }

  // Start new connection
  isBillConnecting = true;

  billConnectionPromise = new Promise<void>(async (resolve, reject) => {
    console.log("[BILL-MQTT] 🔌 Initializing persistent MQTT connection...");

    try {
      globalBillMqttClient = new Paho.Client(
        getMQTTHost(),
        parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || "9000"),
        `bill-cron-persistent-${Date.now()}`
      );

      // Message handler
      globalBillMqttClient.onMessageArrived = (message) => {
        try {
          const payload = JSON.parse(message.payloadString);
          billPayloadsCache[message.destinationName] = payload;
          console.log(`[BILL-MQTT] 📥 Cached: ${message.destinationName}`);
        } catch (e) {
          console.error(
            `[BILL-MQTT] ❌ Parse error: ${message.destinationName}`
          );
        }
      };

      // Connection lost handler
      globalBillMqttClient.onConnectionLost = (responseObject) => {
        isBillConnected = false;
        isBillConnecting = false;
        billConnectionPromise = null;
        console.error(
          "[BILL-MQTT] ⚠️  Connection lost:",
          responseObject.errorMessage
        );
        globalBillMqttClient = null;
        subscribedBillTopics.clear();
      };

      // Connect
      globalBillMqttClient.connect({
        onSuccess: () => {
          isBillConnected = true;
          isBillConnecting = false;
          console.log("[BILL-MQTT] ✅ Connected (PERSISTENT)");

          // Subscribe to all required topics
          requiredTopics.forEach((topic) => {
            try {
              globalBillMqttClient!.subscribe(topic);
              subscribedBillTopics.add(topic);
              console.log(`[BILL-MQTT] 📡 Subscribed: ${topic}`);
            } catch (error) {
              console.error(`[BILL-MQTT] ❌ Subscribe error: ${topic}`, error);
            }
          });

          // Wait for initial payloads
          setTimeout(() => {
            console.log(
              `[BILL-MQTT] 💾 Cache ready (${
                Object.keys(billPayloadsCache).length
              } payloads)`
            );
            resolve();
          }, 1500);
        },
        onFailure: (err) => {
          isBillConnecting = false;
          isBillConnected = false;
          billConnectionPromise = null;
          console.error("[BILL-MQTT] ❌ Connection failed:", err.errorMessage);
          reject(new Error(err.errorMessage));
        },
        useSSL: false,
        keepAliveInterval: 60,
        cleanSession: false,
        reconnect: false,
      });
    } catch (error) {
      isBillConnecting = false;
      isBillConnected = false;
      billConnectionPromise = null;
      reject(error);
    }
  });

  await billConnectionPromise;
}

// --- Endpoint Utama ---
// NOTE: MQTT publishing removed from here
// Publishing is now handled by Bill Publisher Service (every 7 seconds with RETAIN flag)

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Get configId parameter (optional)
  const searchParams = request.nextUrl.searchParams;
  const configIdParam = searchParams.get("configId");

  console.log(
    `\n[CRON-BILL] 🚀 Starting bill calculation${
      configIdParam ? ` for config ${configIdParam}` : ""
    }...`
  );

  // Build where clause
  let whereClause: any = {};
  if (configIdParam) {
    whereClause = { id: configIdParam };
  }

  // 1. Fetch bill configurations
  const configs = await prisma.billConfiguration.findMany({
    where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
    include: { sourceDevice: true, publishTargetDevice: true },
  });

  if (configs.length === 0) {
    return NextResponse.json({
      message: configIdParam
        ? `Bill config ${configIdParam} not found`
        : "No bill configurations found.",
      logged: 0,
      published: 0,
    });
  }

  console.log(`[CRON-BILL] 📊 Processing ${configs.length} config(s)...`);

  // 2. Get unique source topics
  const sourceTopics = [...new Set(configs.map((c) => c.sourceDevice.topic))];

  // 3. Ensure MQTT connection
  try {
    await ensureBillMqttConnection(sourceTopics);
  } catch (error: any) {
    console.error(`[BILL-MQTT] ❌ Connection error:`, error.message);
    return NextResponse.json(
      {
        message: `Failed to connect to MQTT: ${error.message}`,
        logged: 0,
        published: 0,
      },
      { status: 500 }
    );
  }

  // 4. Wait briefly if cache is empty
  const hasAllPayloads = sourceTopics.every(
    (topic) => billPayloadsCache[topic]
  );
  if (!hasAllPayloads) {
    console.log("[BILL-MQTT] ⏳ Waiting for fresh payloads...");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const logsToCreate = [];

  // 5. Process each config
  for (const config of configs) {
    const sourcePayload = billPayloadsCache[config.sourceDevice.topic];

    if (!sourcePayload) {
      console.warn(
        `[CRON-BILL] ⚠️  No cached payload for ${config.sourceDevice.topic}`
      );
      continue;
    }

    if (typeof sourcePayload.value !== "string") {
      console.warn(
        `[CRON-BILL] ⚠️  Invalid payload structure for ${config.customName}`
      );
      continue;
    }

    try {
      const innerPayload = JSON.parse(sourcePayload.value);
      const rawValue = parseFloat(innerPayload[config.sourceDeviceKey]);

      if (isNaN(rawValue)) {
        console.warn(
          `[CRON-BILL] ⚠️  Invalid value for key "${config.sourceDeviceKey}" in ${config.customName}`
        );
        continue;
      }

      // 6. Calculate costs
      const energyKwh = (rawValue * 1) / 1000; // Per 1 jam
      const rupiahCost = energyKwh * config.rupiahRatePerKwh;
      const dollarCost = energyKwh * config.dollarRatePerKwh;

      // 7. Prepare log entry (only for database logging)
      logsToCreate.push({
        configId: config.id,
        rawValue,
        rupiahCost,
        dollarCost,
      });

      console.log(
        `[CRON-BILL] ✅ ${
          config.customName
        }: ${rawValue}W → Rp${rupiahCost.toFixed(2)}/h (logged to DB)`
      );
    } catch (error) {
      console.error(
        `[CRON-BILL] ❌ Processing error for ${config.customName}:`,
        error
      );
    }
  }

  // 9. Save to database
  let savedCount = 0;
  if (logsToCreate.length > 0) {
    try {
      // Verify configs still exist (handle deletion race condition)
      const configIds = logsToCreate.map((entry) => entry.configId);
      const existingConfigs = await prisma.billConfiguration.findMany({
        where: { id: { in: configIds } },
        select: { id: true },
      });

      const existingConfigIds = new Set(existingConfigs.map((c) => c.id));
      const validLogEntries = logsToCreate.filter((entry) =>
        existingConfigIds.has(entry.configId)
      );

      if (validLogEntries.length > 0) {
        await prisma.billLog.createMany({ data: validLogEntries });
        savedCount = validLogEntries.length;
        console.log(`[CRON-BILL] 💾 Saved ${savedCount} bill log(s)`);
      }
    } catch (error) {
      console.error("[CRON-BILL] ❌ Database save error:", error);
      return NextResponse.json(
        { message: "Error saving bill logs", logged: 0 },
        { status: 500 }
      );
    }
  }

  const duration = Date.now() - startTime;
  console.log(
    `[CRON-BILL] ⚡ Completed in ${duration}ms (${savedCount} logged to database)`
  );
  console.log(
    `[CRON-BILL] ℹ️  MQTT publishing handled by Bill Publisher Service (every 7s with RETAIN)\n`
  );

  return NextResponse.json({
    message: "Bill calculation finished",
    configs: configs.length,
    logged: savedCount,
    durationMs: duration,
    mqttConnected: isBillConnected,
    cacheSize: Object.keys(billPayloadsCache).length,
    note: "MQTT publishing handled by Bill Publisher Service (7s interval with RETAIN flag)",
  });
}
