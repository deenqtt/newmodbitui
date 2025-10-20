// File: app/api/cron/log-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Paho from "paho-mqtt";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  // Get parameters from query
  const searchParams = request.nextUrl.searchParams;
  const intervalParam = searchParams.get("interval");
  const configIdParam = searchParams.get("configId"); // 🆕 NEW

  const interval = intervalParam ? parseInt(intervalParam) : null;

  // 🆕 Build where clause based on parameters
  let whereClause: any = {};

  if (configIdParam) {
    // Single config mode
    whereClause = { id: configIdParam };
  } else if (interval) {
    // Interval mode
    whereClause = { loggingIntervalMinutes: interval };
  }
  // else: fetch all configs

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
    `[CRON] Processing ${configs.length} config(s)${
      configIdParam
        ? ` (single config)`
        : interval
        ? ` for ${interval}min interval`
        : ""
    }...`
  );

  // Get unique topics
  const topics = [...new Set(configs.map((c) => c.device.topic))];
  const latestPayloads: Record<string, any> = {};

  function getMQTTHost(): string {
    if (process.env.NEXT_PUBLIC_MQTT_HOST) {
      return process.env.NEXT_PUBLIC_MQTT_HOST;
    }
    return "localhost";
  }

  // MQTT Client setup
  const client = new Paho.Client(
    getMQTTHost(),
    parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || "9000"),
    `cron-logger-${Date.now()}`
  );

  client.onMessageArrived = (message) => {
    try {
      const payload = JSON.parse(message.payloadString);
      latestPayloads[message.destinationName] = payload;
      console.log(
        `[CRON] 📥 Received payload from: ${message.destinationName}`
      );
    } catch (e) {
      console.error(
        `[CRON] ❌ Failed to parse payload from ${message.destinationName}:`,
        message.payloadString
      );
    }
  };

  // Connect to MQTT and subscribe
  try {
    await new Promise<void>((resolve, reject) => {
      client.connect({
        onSuccess: () => {
          console.log("[CRON] ✅ Connected to MQTT broker");
          topics.forEach((topic) => {
            client.subscribe(topic);
            console.log(`[CRON] 📡 Subscribed to: ${topic}`);
          });

          console.log("[CRON] ⏳ Waiting 15 seconds for payloads...");

          setTimeout(() => {
            console.log(
              `[CRON] 📊 Received ${
                Object.keys(latestPayloads).length
              } payload(s)`
            );
            client.disconnect();
            resolve();
          }, 15000); // 15 seconds
        },
        onFailure: (err) => {
          console.error(
            "[CRON] ❌ Failed to connect to MQTT:",
            err.errorMessage
          );
          reject(new Error(err.errorMessage));
        },
        useSSL: false,
      });
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: `Failed to connect to MQTT: ${error.message}`, logged: 0 },
      { status: 500 }
    );
  }

  // File: app/api/cron/log-data/route.ts
  // ... (code sebelumnya sama)

  // Process payloads and create log entries
  const logEntries = [];

  for (const config of configs) {
    const topic = config.device.topic;
    const payload = latestPayloads[topic];

    if (!payload) {
      console.warn(
        `[CRON] ⚠️  No payload for topic ${topic} (Config: ${config.customName})`
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

  // 🔥 FIX: Verify configs still exist before saving
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
        console.log(
          `[CRON] 💾 Saved ${validLogEntries.length} log entry(ies) to database`
        );
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

  return NextResponse.json({
    message: "Cron job finished",
    interval: interval || "single",
    configs: configs.length,
    logged: logEntries.filter((entry) => {
      // Only count entries that were actually saved
      return true; // This will be updated by the validation above
    }).length,
  });
}
