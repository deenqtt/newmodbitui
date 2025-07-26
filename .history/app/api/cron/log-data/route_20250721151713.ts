// File: app/api/cron/log-data/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Paho from "paho-mqtt";

const prisma = new PrismaClient();

// Fungsi ini akan dipanggil secara berkala
export async function GET() {
  console.log("\n[CRON] Cron Job Started: Logging MQTT data...");

  const configs = await prisma.loggingConfiguration.findMany({
    include: { device: true },
  });

  if (configs.length === 0) {
    console.log(
      "[CRON] Tidak ada konfigurasi logging yang ditemukan. Pekerjaan selesai."
    );
    return NextResponse.json({ message: "No configs, job finished." });
  }
  console.log(`[CRON] Ditemukan ${configs.length} konfigurasi untuk diproses.`);

  // Ambil semua topic unik yang perlu di-subscribe
  const topics = [...new Set(configs.map((c) => c.device.topic))];
  const latestPayloads: Record<string, any> = {};
  console.log("[CRON] Akan men-subscribe ke topics:", topics);

  const client = new Paho.Client(
    process.env.NEXT_PUBLIC_MQTT_HOST!,
    parseInt(process.env.NEXT_PUBLIC_MQTT_PORT!),
    `cron-logger-${Date.now()}`
  );

  client.onMessageArrived = (message) => {
    try {
      const payload = JSON.parse(message.payloadString);
      latestPayloads[message.destinationName] = payload;
      console.log(
        `[CRON] Menerima payload dari topic: ${message.destinationName}`
      );
    } catch (e) {
      console.error(
        `[CRON] Gagal mem-parsing payload dari ${message.destinationName}:`,
        message.payloadString,
        e
      );
    }
  };

  // Gunakan Promise untuk menangani koneksi dan menunggu data
  console.log("[CRON] Menghubungkan ke broker MQTT...");
  await new Promise<void>((resolve, reject) => {
    client.connect({
      onSuccess: () => {
        console.log(
          "[CRON] Berhasil terhubung ke MQTT. Men-subscribe topics..."
        );
        topics.forEach((topic) => client.subscribe(topic));

        // Tunggu 5 detik untuk memberi waktu data masuk
        console.log("[CRON] Menunggu 5 detik untuk data masuk...");
        setTimeout(() => {
          client.disconnect();
          console.log("[CRON] Waktu tunggu selesai. Memutus koneksi MQTT.");
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
  console.log("[CRON] Memulai proses pencocokan konfigurasi dengan payload...");

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
        console.log(
          `[CRON] Data valid ditemukan untuk "${config.customName}". Key: ${config.key}, Value: ${finalValue}`
        );
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
    console.log(
      `[CRON] Akan menyimpan ${logEntries.length} data log baru ke database...`
    );
    await prisma.loggedData.createMany({ data: logEntries });
    console.log("[CRON] Berhasil menyimpan data log.");
  } else {
    console.log("[CRON] Tidak ada data log baru untuk disimpan.");
  }

  return NextResponse.json({
    message: "Cron job finished.",
    logged: logEntries.length,
  });
}
