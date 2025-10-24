// File: lib/services/health-check.ts (dengan Debug Log)

import { prisma } from "@/lib/prisma";
import mqtt from "mqtt";

// --- KONFIGURASI ---
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
const HEALTH_TOPIC = "iot/door/health/+";
const CHECK_OFFLINE_INTERVAL_MS = 60000; // Cek setiap 60 detik
const OFFLINE_THRESHOLD_MS = 90000; // Dianggap offline jika tidak ada kabar > 90 detik

let intervalId: NodeJS.Timeout | null = null;
let mqttClient: mqtt.MqttClient | null = null;
let lastStatusLog = Date.now(); // Track last status summary log
let statusSummary = { online: 0, offline: 0, totalChecks: 0 };

async function checkOfflineControllers() {
  const cutoffTime = new Date(Date.now() - OFFLINE_THRESHOLD_MS);

  // Menggunakan 'findMany' dulu untuk melihat siapa yang akan di-update (opsional tapi bagus untuk debug)
  const controllersToUpdate = await prisma.accessController.findMany({
    where: {
      status: "online",
      lastSeen: {
        lt: cutoffTime,
      },
    },
    select: {
      name: true,
      id: true,
    },
  });

  statusSummary.totalChecks++;

  if (controllersToUpdate.length > 0) {
    statusSummary.offline += controllersToUpdate.length;

    const result = await prisma.accessController.updateMany({
      where: {
        id: {
          in: controllersToUpdate.map((c) => c.id),
        },
      },
      data: {
        status: "offline",
        lockCount: 0,
      },
    });

    // Log offline detection with summary
    controllersToUpdate.forEach((controller) => {
      console.log(`⚠️ [Health Check] Controller offline: ${controller.name}`);
    });
  } else {
    statusSummary.online++;
  }

  // Periodic status summary every 5 minutes (instead of every minute logging)
  const now = Date.now();
  if (now - lastStatusLog > 5 * 60 * 1000) { // 5 minutes
    console.log(`📊 [Health Check] Status summary - Online: ${statusSummary.online}, Offline: ${statusSummary.offline} (Total checks: ${statusSummary.totalChecks})`);

    // Reset summary counters
    statusSummary = { online: 0, offline: 0, totalChecks: 0 };
    lastStatusLog = now;
  }
}

export function getHealthCheckService() {
  if (mqttClient && mqttClient.connected) {
    return;
  }

  mqttClient = mqtt.connect(MQTT_BROKER_URL);

  mqttClient.on("connect", () => {
    mqttClient?.subscribe(HEALTH_TOPIC, (err) => {
      if (err) {
        console.error("❌ [Service] Gagal subscribe ke health topic:", err);
      } else {
        console.log(
          `👂 [Service] Berhasil subscribe ke topik: ${HEALTH_TOPIC}`
        );
      }
    });
  });

  mqttClient.on("message", async (topic, payload) => {
    if (topic.startsWith("iot/door/health/")) {
      try {
        const message = JSON.parse(payload.toString());

        const { ip, macAddress, locks, doorStatus, lockAddresses } = message;

        if (!macAddress) {
          console.warn(
            "   ⚠️ PERINGATAN: Pesan health beat tidak memiliki macAddress. Dilewati."
          );
          return;
        }

        const controller = await prisma.accessController.upsert({
          where: { macAddress: macAddress },
          update: {
            ipAddress: ip,
            status: "online",
            lockCount: locks,
            lastSeen: new Date(),
          },
          create: {
            macAddress: macAddress,
            ipAddress: ip,
            name: `New Controller (${ip})`,
            status: "online",
            lockCount: locks,
            lastSeen: new Date(),
          },
        });
      } catch (error) {
        console.error("   ❌ ERROR: Gagal memproses pesan health beat:", error);
      }
    }
  });

  mqttClient.on("error", (err) => {
    console.error("❌ [Service] Koneksi MQTT error:", err);
  });

  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(checkOfflineControllers, CHECK_OFFLINE_INTERVAL_MS);
}
