// File: services/mqtt-listener-service.js

const mqtt = require("mqtt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const MQTT_HOST = process.env.NEXT_PUBLIC_MQTT_HOST || "localhost";
const MQTT_PORT = process.env.NEXT_PUBLIC_MQTT_PORT || "9000";
const MQTT_URL = `ws://${MQTT_HOST}:${MQTT_PORT}`;

// --- BARU: Fungsi helper untuk mengambil nilai dari objek, termasuk yang nested ---
// Memungkinkan key seperti "lux" atau "data.lux"
function getNestedValue(obj, path) {
  if (!path) return undefined;
  const keys = path.split(".");
  return keys.reduce(
    (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
    obj
  );
}

// Fungsi utama untuk memulai servis
async function startService() {
  console.log(`[MQTT Service] Mencoba terhubung ke ${MQTT_URL} (WebSocket)...`);

  try {
    const configs = await prisma.billConfiguration.findMany({
      include: {
        sourceDevice: true,
        publishTargetDevice: true,
      },
    });

    if (configs.length === 0) {
      console.log(
        "[MQTT Service] Tidak ada konfigurasi ditemukan. Mencoba lagi dalam 15 detik..."
      );
      setTimeout(startService, 15000);
      return;
    }

    console.log(`[MQTT Service] Ditemukan ${configs.length} konfigurasi.`);

    const client = mqtt.connect(MQTT_URL, {
      clientId: `mqtt-listener-service-${Math.random().toString(16).slice(2)}`,
      reconnectPeriod: 5000,
    });

    client.on("connect", () => {
      console.log("[MQTT Service] Terhubung ke broker MQTT via WebSocket.");
      const sourceTopics = [
        ...new Set(configs.map((c) => c.sourceDevice.topic)),
      ];
      client.subscribe(sourceTopics, (err) => {
        if (!err) {
          console.log(
            "[MQTT Service] Berhasil subscribe ke topik:",
            sourceTopics.join(", ")
          );
        } else {
          console.error("[MQTT Service] Gagal subscribe:", err);
        }
      });
    });

    client.on("message", async (topic, message) => {
      const payloadStr = message.toString();
      console.log(`[MQTT Service] Pesan diterima di topik [${topic}]`);

      const relevantConfigs = configs.filter(
        (c) => c.sourceDevice.topic === topic
      );

      for (const config of relevantConfigs) {
        try {
          const payload = JSON.parse(payloadStr);
          // --- PERBAIKAN: Gunakan fungsi helper untuk mengambil nilai ---
          const rawValue = parseFloat(
            getNestedValue(payload, config.sourceDeviceKey)
          );

          if (isNaN(rawValue)) {
            console.warn(
              `[MQTT Service] Nilai tidak valid untuk key '${config.sourceDeviceKey}' di config '${config.customName}'. Pastikan key dan struktur payload benar.`
            );
            continue;
          }

          const energyKwh = (rawValue * 1) / 1000;
          const rupiahCost = energyKwh * config.rupiahRatePerKwh;
          const dollarCost = energyKwh * config.dollarRatePerKwh;

          await prisma.billLog.create({
            data: {
              configId: config.id,
              rawValue,
              rupiahCost,
              dollarCost,
            },
          });
          console.log(
            `[MQTT Service] Log disimpan untuk '${config.customName}'.`
          );

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

          client.publish(
            config.publishTargetDevice.topic,
            JSON.stringify(publishPayload)
          );
          console.log(
            `[MQTT Service] Hasil dipublikasikan ke topik '${config.publishTargetDevice.topic}'.`
          );
        } catch (error) {
          console.error(
            `[MQTT Service] Gagal memproses pesan untuk config '${config.customName}':`,
            error
          );
        }
      }
    });

    client.on("error", (err) => {
      console.error("[MQTT Service] Error koneksi:", err.message);
    });

    client.on("close", () => {
      console.log(
        "[MQTT Service] Koneksi terputus. Mencoba menghubungkan kembali..."
      );
    });
  } catch (dbError) {
    console.error(
      "[MQTT Service] Gagal mengambil konfigurasi dari database:",
      dbError
    );
    setTimeout(startService, 15000);
  }
}

startService();
