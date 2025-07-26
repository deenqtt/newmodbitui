// File: app/api/cron/log-data/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Paho from "paho-mqtt";

const prisma = new PrismaClient();

// Fungsi ini akan dipanggil setiap 10 menit
export async function GET() {
  console.log("Cron Job Started: Logging MQTT data...");

  const configs = await prisma.loggingConfiguration.findMany({
    include: { device: true },
  });
  if (configs.length === 0) {
    return NextResponse.json({ message: "No configs, job finished." });
  }

  const topics = [...new Set(configs.map((c) => c.device.topic))];
  const latestPayloads: Record<string, any> = {};

  const client = new Paho.Client(
    process.env.NEXT_PUBLIC_MQTT_HOST!,
    parseInt(process.env.NEXT_PUBLIC_MQTT_PORT!),
    `cron-logger-${Date.now()}`
  );
  client.onMessageArrived = (message) => {
    try {
      latestPayloads[message.destinationName] = JSON.parse(
        message.payloadString
      );
    } catch (e) {
      console.error("Cron: Error parsing payload", e);
    }
  };

  // Gunakan Promise untuk menangani koneksi
  await new Promise<void>((resolve, reject) => {
    client.connect({
      onSuccess: () => {
        topics.forEach((topic) => client.subscribe(topic));
        // Tunggu 5 detik untuk menerima data
        setTimeout(() => {
          client.disconnect();
          resolve();
        }, 5000);
      },
      onFailure: (err) => reject(new Error(err.errorMessage)),
      useSSL: false,
    });
  });

  const logEntries = [];
  // ... (Logika lengkap untuk memproses dan menyimpan log seperti di contoh sebelumnya)

  if (logEntries.length > 0) {
    await prisma.loggedData.createMany({ data: logEntries });
  }

  return NextResponse.json({ logged: logEntries.length });
}
