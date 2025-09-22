// File: app/api/cron/log-data/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Paho from "paho-mqtt";

const prisma = new PrismaClient();

// Fungsi ini akan dipanggil secara berkala
export async function GET() {
  const configs = await prisma.loggingConfiguration.findMany({
    include: { device: true },
  });

  if (configs.length === 0) {
    return NextResponse.json({ message: "No configs, job finished." });
  }

  // Ambil semua topic unik yang perlu di-subscribe
  const topics = [...new Set(configs.map((c) => c.device.topic))];
  const latestPayloads: Record<string, any> = {};
  function getMQTTHost(): string {
    // Development: gunakan env variable
    if (process.env.NEXT_PUBLIC_MQTT_HOST) {
      return process.env.NEXT_PUBLIC_MQTT_HOST;
    }

    // Server-side fallback ke localhost
    return "localhost";
  }

  // Ganti bagian client initialization:
  const client = new Paho.Client(
    getMQTTHost(), // UBAH INI
    parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || "9000"), // UBAH INI
    `cron-logger-${Date.now()}`
  );

  client.onMessageArrived = (message) => {
    try {
      const payload = JSON.parse(message.payloadString);
      latestPayloads[message.destinationName] = payload;
    } catch (e) {
      console.error(
        `[CRON] Gagal mem-parsing payload dari ${message.destinationName}:`,
        message.payloadString,
        e
      );
    }
  };

  await new Promise<void>((resolve, reject) => {
    client.connect({
      onSuccess: () => {
        topics.forEach((topic) => client.subscribe(topic));

        setTimeout(() => {
          client.disconnect();

          resolve();
        }, 5000);
      },
      onFailure: (err) => {
        console.error("[CRON] Gagal terhubung ke MQTT:", err.errorMessage);
        reject(new Error(err.errorMessage));
      },
      useSSL: false,
    });
  }).catch((error) => {
    // Tangani jika koneksi gagal total
    return NextResponse.json(
      { message: `Failed to connect to MQTT: ${error.message}` },
      { status: 500 }
    );
  });

  // --- LOGIKA UTAMA UNTUK MEMPROSES DAN MENYIMPAN LOG ---
  const logEntries = [];

  for (const config of configs) {
    const topic = config.device.topic;
    const payload = latestPayloads[topic];

    if (!payload) {
      console.warn(
        `[CRON] Tidak ada payload diterima untuk topic ${topic} (Config: ${config.customName})`
      );
      continue;
    }

    if (typeof payload.value !== "string") {
      console.warn(
        `[CRON] Payload untuk topic ${topic} tidak memiliki field 'value' berupa string.`
      );
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
      } else {
        console.warn(
          `[CRON] Key "${config.key}" tidak ditemukan atau nilainya bukan angka di payload topic ${topic}.`
        );
      }
    } catch (e) {
      console.error(
        `[CRON] Gagal memproses payload untuk config "${config.customName}":`,
        e
      );
    }
  }

  if (logEntries.length > 0) {
    await prisma.loggedData.createMany({ data: logEntries });
  } else {
    console.log("[CRON] Tidak ada data log baru untuk disimpan.");
  }

  return NextResponse.json({
    message: "Cron job finished.",
    logged: logEntries.length,
  });
}
