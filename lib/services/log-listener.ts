// Lokasi File: lib/services/log-listener.ts

import { PrismaClient } from "@prisma/client";
import mqtt from "mqtt";

// --- KONFIGURASI ---
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
const LOG_TOPIC = "iot/door/logs";

let mqttClient: mqtt.MqttClient | null = null;
const prisma = new PrismaClient();

export function getLogListenerService() {
  if (mqttClient && mqttClient.connected) {
    return;
  }

  mqttClient = mqtt.connect(MQTT_BROKER_URL);

  mqttClient.on("connect", () => {
    mqttClient?.subscribe(LOG_TOPIC, (err) => {
      if (err) {
        console.error("❌ Gagal subscribe ke topik log:", err);
      } else {
        console.log(`👂 Berhasil subscribe ke topik: ${LOG_TOPIC}`);
      }
    });
  });

  mqttClient.on("message", async (topic, payload) => {
    if (topic === LOG_TOPIC) {
      try {
        const logData = JSON.parse(payload.toString());
        // <-- 1. Ambil field 'username' yang baru -->
        const {
          controllerIp,
          timestamp,
          method,
          cardNumber,
          jobId,
          username, // <-- Field baru dari ESP32
          lockAddress,
        } = logData;

        if (!controllerIp) {
          console.warn("Log diterima tanpa IP controller, dilewati.");
          return;
        }

        const controller = await prisma.accessController.findFirst({
          where: { ipAddress: controllerIp },
        });

        if (!controller) {
          console.warn(
            `Log diterima dari controller tidak dikenal (IP: ${controllerIp}), dilewati.`
          );
          return;
        }

        // <-- 2. Susun ulang pesan log agar lebih informatif -->
        let message = `Lock ${lockAddress} | ${username || "Unknown User"}`;
        if (jobId > 0) {
          message += ` (Job ID: ${jobId})`;
        }
        message += ` event by ${method}`;
        if (cardNumber && cardNumber !== "0") {
          message += ` (Card: ${cardNumber})`;
        }

        await prisma.activityLog.create({
          data: {
            controllerId: controller.id,
            timestamp: new Date(timestamp),
            message: message, // <-- Gunakan pesan baru yang sudah diformat
            details: {
              // <-- 3. Simpan juga username di dalam details -->
              method,
              cardNumber,
              jobId,
              username,
              lockAddress,
            },
          },
        });
      } catch (error) {
        console.error("❌ Error memproses pesan log:", error);
      }
    }
  });

  mqttClient.on("error", (err) => {
    console.error("MQTT log listener connection error:", err);
  });
}
