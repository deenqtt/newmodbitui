// File: lib/mqtt-service-trigger.ts

import axios from "axios";
import crypto from "crypto";

// URL ini menunjuk ke service MQTT Anda yang berjalan di port 3001
const WEBHOOK_URL =
  process.env.MQTT_SERVICE_WEBHOOK_URL ||
  "http://localhost:3001/webhook/config-update";

// Secret ini harus SAMA PERSIS dengan yang ada di file .env service MQTT Anda
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/**
 * Fungsi ini mengirimkan sinyal POST ke service MQTT.
 * Dibuat "fire-and-forget", artinya ia tidak akan memperlambat API utama Anda.
 */
export function triggerMqttServiceUpdate() {
  // Kita membuat body dan signature di sini agar bisa digunakan di kedua tempat
  const body = { event: "config_updated", timestamp: new Date().toISOString() };
  const signature = WEBHOOK_SECRET
    ? crypto
        .createHmac("sha265", WEBHOOK_SECRET)
        .update(JSON.stringify(body))
        .digest("base64")
    : undefined;

  // Mengirim request POST menggunakan axios
  axios
    .post(WEBHOOK_URL, body, {
      headers: {
        // Jika ada secret, kita kirim signature agar request lebih aman
        ...(signature && { "x-supabase-webhook-hmac": signature }),
      },
    })
    .then(() => {
      // Ini hanya akan muncul di log terminal server Next.js Anda, bukan di browser
      console.log("Notifikasi update ke service MQTT berhasil dikirim.");
    })
    .catch((error) => {
      // Jika service MQTT sedang mati atau error, API utama Anda tidak akan ikut error.
      // Pesan ini hanya akan muncul di log terminal server Next.js.
      console.error(
        "Gagal mengirim notifikasi ke service MQTT:",
        error.message
      );
    });
}
