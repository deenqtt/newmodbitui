// File: app/api/cron/log-data/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Paho from "paho-mqtt";

const prisma = new PrismaClient();

// Fungsi ini akan dipanggil setiap 10 menit oleh Vercel Cron Jobs
export async function GET() {
  console.log("Cron Job Started: Fetching MQTT data for logging...");

  // 1. Ambil semua konfigurasi logging dari DB
  const configs = await prisma.loggingConfiguration.findMany({
    include: { device: true },
  });

  if (configs.length === 0) {
    console.log("No logging configurations found. Cron Job finished.");
    return NextResponse.json({ message: "No configs, job finished." });
  }

  // 2. Kumpulkan semua topic yang perlu di-subscribe
  const topicsToSubscribe = [...new Set(configs.map((c) => c.device.topic))];

  // 3. Buat koneksi sementara ke MQTT untuk mengambil data
  const mqttHost = process.env.NEXT_PUBLIC_MQTT_HOST!;
  const mqttPort = parseInt(process.env.NEXT_PUBLIC_MQTT_PORT!);
  const client = new Paho.Client(
    mqttHost,
    mqttPort,
    `cron-logger-${Date.now()}`
  );

  const latestPayloads: Record<string, any> = {};

  client.onMessageArrived = (message) => {
    try {
      // Simpan payload terakhir untuk setiap topic
      latestPayloads[message.destinationName] = JSON.parse(
        message.payloadString
      );
    } catch (e) {
      console.error("Error parsing payload in cron", e);
    }
  };

  // Promise untuk menangani koneksi yang asynchronous
  await new Promise<void>((resolve, reject) => {
    client.connect({
      onSuccess: () => {
        console.log(
          "Cron MQTT connected. Subscribing to topics:",
          topicsToSubscribe
        );
        topicsToSubscribe.forEach((topic) => client.subscribe(topic));
        // Beri waktu beberapa detik untuk menerima data
        setTimeout(() => {
          client.disconnect();
          resolve();
        }, 5000); // Tunggu 5 detik
      },
      onFailure: (err) => {
        console.error("Cron MQTT connection failed:", err.errorMessage);
        reject(new Error(err.errorMessage));
      },
      useSSL: false, // Sesuaikan
    });
  });

  // 4. Proses dan simpan data ke tabel LoggedData
  const logEntries = [];
  for (const config of configs) {
    const payload = latestPayloads[config.device.topic];
    if (payload && payload[config.key] !== undefined) {
      const value = parseFloat(payload[config.key]);
      if (!isNaN(value)) {
        logEntries.push({
          configId: config.id,
          value: value * (config.multiply || 1),
        });
      }
    }
  }

  if (logEntries.length > 0) {
    await prisma.loggedData.createMany({ data: logEntries });
    console.log(`Successfully logged ${logEntries.length} data points.`);
  }

  return NextResponse.json({ logged: logEntries.length });
}
