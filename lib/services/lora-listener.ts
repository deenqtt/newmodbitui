import { prisma } from "@/lib/prisma";
import mqtt from "mqtt";

// --- KONFIGURASI ---
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || "ws://52.74.91.79:9000";
// Topik ini akan menangkap semua event 'up' dari semua perangkat di semua aplikasi
const LORA_UPLINK_TOPIC = "application/+/device/+/event/up";

let mqttClient: mqtt.MqttClient | null = null;

export function getLoraListenerService() {
  // Mencegah service berjalan ganda jika sudah terhubung
  if (mqttClient && mqttClient.connected) {
    return;
  }

  // Opsi koneksi, termasuk username, password, dan Client ID unik
  const options: mqtt.IClientOptions = {
    clientId: `backend-lora-listener-${Math.random().toString(16).slice(2)}`,
    username: process.env.MQTT_USERNAME, // Ambil dari file .env
    password: process.env.MQTT_PASSWORD, // Ambil dari file .env
  };

  mqttClient = mqtt.connect(MQTT_BROKER_URL, options);

  // --- Penanganan Event Koneksi ---

  mqttClient.on("connect", () => {
    mqttClient?.subscribe(LORA_UPLINK_TOPIC, (err) => {
      if (err) {
        console.error(
          `❌ [LoRa Listener] Gagal subscribe ke topik: ${LORA_UPLINK_TOPIC}`,
          err
        );
      } else {
        console.log(
          `👂 [LoRa Listener] Berhasil subscribe ke topik: ${LORA_UPLINK_TOPIC}`
        );
      }
    });
  });

  // --- Logika Utama Saat Menerima Pesan ---

  mqttClient.on("message", async (topic, payload) => {
    try {
      const message = JSON.parse(payload.toString());
      const devEui = message.deviceInfo?.devEui;
      const deviceName = message.deviceInfo?.deviceName;

      // Mengambil data dari field "data" yang berisi format Base64
      const base64Data = message.data;

      if (!devEui || !base64Data || !deviceName) {
        console.warn(
          "⚠️ [LoRa Listener] Pesan tidak memiliki info dasar (devEui, deviceName, data), dilewati."
        );
        return;
      }

      // Decode data dari Base64 ke format yang bisa dibaca (JSON atau teks)
      const decodedPayload = Buffer.from(base64Data, "base64").toString("utf8");
      let sensorData;

      try {
        // Coba parsing sebagai JSON, karena banyak sensor mengirim data dalam format ini
        sensorData = JSON.parse(decodedPayload);
      } catch (e) {
        // Jika gagal, berarti datanya adalah teks biasa (seperti "Hello, ChirpStack!")
        // Kita bungkus dalam object agar konsisten
        sensorData = { value: decodedPayload };
      }

      // 'upsert' akan membuat device baru jika belum ada, atau mengupdate jika sudah ada
      const device = await prisma.loraDevice.upsert({
        where: { devEui: devEui },
        update: {
          name: deviceName,
          lastSeen: new Date(),
        },
        create: {
          devEui: devEui,
          name: deviceName,
          lastSeen: new Date(),
        },
      });

      // Buat entri data baru yang terhubung ke perangkat di atas
      await prisma.deviceData.create({
        data: {
          deviceId: device.id,
          data: sensorData, // Simpan data yang sudah di-decode dan di-parse
        },
      });
    } catch (error) {
      console.error("❌ [LoRa Listener] Gagal memproses pesan LoRa:", error);
    }
  });

  // --- Penanganan Error dan Koneksi Ulang ---

  mqttClient.on("reconnect", () => {
    console.log("🔄 [LoRa Listener] Mencoba terhubung kembali ke MQTT...");
  });

  mqttClient.on("error", (err) => {
    console.error("❌ [LoRa Listener] Koneksi MQTT error:", err);
  });

  mqttClient.on("close", () => {
    console.log("🔌 [LoRa Listener] Koneksi MQTT ditutup.");
  });
}
