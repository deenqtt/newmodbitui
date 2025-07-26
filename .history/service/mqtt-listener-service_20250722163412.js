// File: mqtt-listener-service.js
// Lokasi: Simpan di root folder proyek Anda.

// Jalankan `npm install mqtt` untuk menambahkan library ini.
const mqtt = require("mqtt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Konfigurasi MQTT dari environment variables
const MQTT_HOST = process.env.NEXT_PUBLIC_MQTT_HOST || "localhost";
const MQTT_PORT = process.env.NEXT_PUBLIC_MQTT_PORT || "1883"; // Port standar MQTT
const MQTT_URL = `mqtt://${MQTT_HOST}:${MQTT_PORT}`;

// Fungsi utama untuk memulai servis
async function startService() {
  console.log("[MQTT Service] Memulai servis...");

  try {
    // 1. Ambil semua konfigurasi dari database untuk mengetahui topik mana yang harus didengarkan
    const configs = await prisma.billConfiguration.findMany({
      include: {
        sourceDevice: true, // Untuk mendapatkan topik sumber
        publishTargetDevice: true, // Untuk mendapatkan topik tujuan
      },
    });

    if (configs.length === 0) {
      console.log(
        "[MQTT Service] Tidak ada konfigurasi ditemukan. Menunggu..."
      );
      // Anda bisa menambahkan logika untuk memeriksa ulang secara berkala jika mau
      return;
    }

    console.log(`[MQTT Service] Ditemukan ${configs.length} konfigurasi.`);

    // 2. Hubungkan ke broker MQTT
    const client = mqtt.connect(MQTT_URL, {
      clientId: `mqtt-listener-service-${Math.random().toString(16).slice(2)}`,
    });

    client.on("connect", () => {
      console.log("[MQTT Service] Terhubung ke broker MQTT.");

      // 3. Subscribe ke semua topik sumber yang unik
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

    // 4. Proses setiap pesan yang masuk (INI INTI DARI LOGIKA REAL-TIME)
    client.on("message", async (topic, message) => {
      const payloadStr = message.toString();
      console.log(
        `[MQTT Service] Pesan diterima di topik [${topic}]: ${payloadStr}`
      );

      // Cari semua konfigurasi yang menggunakan topik ini sebagai sumber
      const relevantConfigs = configs.filter(
        (c) => c.sourceDevice.topic === topic
      );

      for (const config of relevantConfigs) {
        try {
          const payload = JSON.parse(payloadStr);
          const rawValue = parseFloat(payload[config.sourceDeviceKey]);

          if (isNaN(rawValue)) {
            console.warn(
              `[MQTT Service] Nilai tidak valid untuk key '${config.sourceDeviceKey}' di config '${config.customName}'`
            );
            continue; // Lanjut ke config berikutnya jika ada
          }

          // Lakukan perhitungan biaya
          const energyKwh = (rawValue * 1) / 1000; // Asumsi per jam
          const rupiahCost = energyKwh * config.rupiahRatePerKwh;
          const dollarCost = energyKwh * config.dollarRatePerKwh;

          // Simpan ke database
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

          // Siapkan payload untuk dipublikasikan
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

          // Publikasikan hasil ke topik virtual
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
      console.error("[MQTT Service] Error koneksi:", err);
    });
  } catch (dbError) {
    console.error(
      "[MQTT Service] Gagal mengambil konfigurasi dari database:",
      dbError
    );
    // Coba lagi setelah beberapa saat jika koneksi DB gagal
    setTimeout(startService, 15000);
  }
}

// Jalankan servis
startService();
