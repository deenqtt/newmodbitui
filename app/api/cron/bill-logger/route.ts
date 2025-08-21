// File: app/api/cron/bill-logger/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Paho from "paho-mqtt";
export const dynamic = "force-dynamic"; // ✅ Tambahkan baris ini

// --- Fungsi Helper ---

// Fungsi untuk menghubungkan, subscribe, dan mengambil data dari MQTT
const getLatestMqttData = (topics: string[]): Promise<Record<string, any>> => {
  return new Promise((resolve, reject) => {
    const latestPayloads: Record<string, any> = {};

    const client = new Paho.Client(
      process.env.NEXT_PUBLIC_MQTT_HOST!,
      parseInt(process.env.NEXT_PUBLIC_MQTT_PORT!),
      `cron-bill-logger-${Date.now()}`
    );

    client.onMessageArrived = (message) => {
      try {
        const payload = JSON.parse(message.payloadString);
        latestPayloads[message.destinationName] = payload;
      } catch (e) {
        console.error(
          `[CRON-BILL] Gagal parse payload dari ${message.destinationName}`
        );
      }
    };

    client.connect({
      onSuccess: () => {
        topics.forEach((topic) => client.subscribe(topic));
        // Tunggu 5 detik untuk data masuk, lalu selesaikan
        setTimeout(() => {
          client.disconnect();
          resolve(latestPayloads);
        }, 5000);
      },
      onFailure: (err) => {
        reject(new Error(err.errorMessage));
      },
      useSSL: false,
    });
  });
};

// Fungsi untuk mempublikasikan hasil ke MQTT
const publishResults = (publishTasks: { topic: string; payload: string }[]) => {
  if (publishTasks.length === 0) return;

  const client = new Paho.Client(
    process.env.NEXT_PUBLIC_MQTT_HOST!,
    parseInt(process.env.NEXT_PUBLIC_MQTT_PORT!),
    `cron-bill-publisher-${Date.now()}`
  );

  client.connect({
    onSuccess: () => {
      publishTasks.forEach((task) => {
        const message = new Paho.Message(task.payload);
        message.destinationName = task.topic;
        client.send(message);
      });
      client.disconnect();
    },
    onFailure: (err) => {
      console.error(
        "[CRON-BILL] Gagal terhubung ke MQTT untuk publish:",
        err.errorMessage
      );
    },
  });
};

// --- Endpoint Utama ---

export async function GET() {
  console.log("\n[CRON-BILL] Memulai cron job Bill Calculation...");

  // 1. Ambil semua konfigurasi tagihan dari database
  const configs = await prisma.billConfiguration.findMany({
    include: { sourceDevice: true, publishTargetDevice: true },
  });

  if (configs.length === 0) {
    return NextResponse.json({ message: "No bill configurations found." });
  }

  // 2. Kumpulkan semua topic sumber yang perlu didengarkan
  const sourceTopics = [...new Set(configs.map((c) => c.sourceDevice.topic))];
  const latestPayloads = await getLatestMqttData(sourceTopics);

  const logsToCreate = [];
  const publishTasks = [];

  // 3. Proses setiap konfigurasi
  for (const config of configs) {
    const sourcePayload = latestPayloads[config.sourceDevice.topic];
    if (!sourcePayload || typeof sourcePayload.value !== "string") continue;

    try {
      const innerPayload = JSON.parse(sourcePayload.value);
      const rawValue = parseFloat(innerPayload[config.sourceDeviceKey]);

      if (isNaN(rawValue)) continue;

      // 4. Lakukan perhitungan biaya
      const energyKwh = (rawValue * 1) / 1000; // Asumsi per 1 jam
      const rupiahCost = energyKwh * config.rupiahRatePerKwh;
      const dollarCost = energyKwh * config.dollarRatePerKwh;

      // 5. Siapkan data untuk disimpan ke log
      logsToCreate.push({
        configId: config.id,
        rawValue,
        rupiahCost,
        dollarCost,
      });

      // 6. Siapkan data untuk dipublikasikan ke MQTT
      const publishPayload = {
        Timestamp: new Date().toISOString(),
        device_name: config.customName,
        address: config.publishTargetDevice.address,
        value: {
          power_watt: rawValue,
          cost_idr_per_hour: rupiahCost,
          cost_usd_per_hour: dollarCost,
        },
      };
      publishTasks.push({
        topic: config.publishTargetDevice.topic,
        payload: JSON.stringify(publishPayload),
      });
    } catch (error) {
      console.error(
        `[CRON-BILL] Gagal memproses config ${config.customName}:`,
        error
      );
    }
  }

  // 7. Simpan semua log ke database dalam satu operasi
  if (logsToCreate.length > 0) {
    await prisma.billLog.createMany({
      data: logsToCreate,
    });
  }

  // 8. Publikasikan semua hasil ke MQTT
  publishResults(publishTasks);

  return NextResponse.json({
    message: "Bill calculation cron job finished.",
    logged: logsToCreate.length,
    published: publishTasks.length,
  });
}
