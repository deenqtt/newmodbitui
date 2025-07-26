"use client";

import { useState, useEffect } from "react";
import Paho from "paho-mqtt";

// Definisikan tipe data untuk status koneksi
type Status = "connected" | "disconnected" | "connecting";

export function useConnectivity() {
  const [dbStatus, setDbStatus] = useState<Status>("connecting");
  const [mqttStatus, setMqttStatus] = useState<Status>("connecting");

  // --- 1. Logika untuk Pengecekan Status Database ---
  useEffect(() => {
    const checkDb = async () => {
      console.log("Mencoba cek status database..."); // Log untuk debug
      try {
        const res = await fetch("/api/health");

        console.log("Response dari /api/health:", res.status, res.statusText); // Log untuk debug

        if (res.ok) {
          setDbStatus("connected");
        } else {
          setDbStatus("disconnected");
        }
      } catch (error) {
        console.error("Terjadi error saat fetch /api/health:", error); // Log untuk debug
        setDbStatus("disconnected");
      }
    };

    checkDb(); // Jalankan sekali saat pertama dimuat
    const interval = setInterval(checkDb, 30000); // Ulangi setiap 30 detik

    // Hentikan interval saat komponen di-unmount
    return () => clearInterval(interval);
  }, []);

  // --- 2. Logika untuk Koneksi MQTT ---
  useEffect(() => {
    // Ambil konfigurasi dari file .env
    const mqttHost = process.env.NEXT_PUBLIC_MQTT_HOST || "broker.hivemq.com";
    const mqttPort = parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || "9001");
    const clientId = "modbo_dashboard_" + new Date().getTime();

    // Buat client Paho MQTT
    const client = new Paho.Client(mqttHost, mqttPort, clientId);

    // Definisikan callback handler
    client.onConnectionLost = (responseObject) => {
      if (responseObject.errorCode !== 0) {
        console.log("Koneksi MQTT terputus:", responseObject.errorMessage);
        setMqttStatus("disconnected");
      }
    };

    client.onMessageArrived = (message) => {
      console.log("Pesan MQTT diterima:", message.payloadString);
      // Tambahkan logika untuk menangani pesan di sini
    };

    // Fungsi untuk memulai koneksi
    const connectMqtt = () => {
      setMqttStatus("connecting");
      client.connect({
        onSuccess: () => {
          console.log("Berhasil terhubung ke MQTT Broker.");
          setMqttStatus("connected");
          // Anda bisa subscribe ke topic di sini jika perlu
          // client.subscribe("some/topic");
        },
        onFailure: (err) => {
          console.error("Gagal terhubung ke MQTT:", err.errorMessage);
          setMqttStatus("disconnected");
        },
        useSSL: true, // Gunakan true jika port Anda menggunakan WSS (WebSocket Secure)
        userName: process.env.NEXT_PUBLIC_MQTT_USERNAME,
        password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
        reconnect: true, // Coba sambungkan kembali secara otomatis
      });
    };

    connectMqtt();

    // Hentikan koneksi saat komponen di-unmount
    return () => {
      if (client.isConnected()) {
        client.disconnect();
      }
    };
  }, []);

  // Kembalikan kedua status
  return { dbStatus, mqttStatus };
}
