"use client";

import { useState, useEffect, useRef } from "react";
import Paho from "paho-mqtt";

// Definisikan tipe data yang lebih deskriptif
type ConnectionStatus = "connected" | "disconnected" | "connecting" | "error";
interface Payloads {
  [topic: string]: string;
}

/**
 * Custom React Hook untuk mengelola koneksi ke Database (via health check) dan MQTT Broker.
 * @param topicsToSubscribe Array string dari topic MQTT yang ingin di-subscribe.
 * @returns Object berisi status koneksi DB, status koneksi MQTT, dan payloads dari topic yang di-subscribe.
 */
export function useConnectivity(topicsToSubscribe: string[]): {
  dbStatus: ConnectionStatus;
  mqttStatus: ConnectionStatus;
  payloads: Payloads;
} {
  const [dbStatus, setDbStatus] = useState<ConnectionStatus>("connecting");
  const [mqttStatus, setMqttStatus] = useState<ConnectionStatus>("connecting");
  const [payloads, setPayloads] = useState<Payloads>({});

  // Gunakan useRef untuk menyimpan instance klien MQTT agar tidak dibuat ulang pada setiap render.
  const clientRef = useRef<Paho.Client | null>(null);

  // --- 1. Logika untuk Pengecekan Status Database (Tidak berubah) ---
  useEffect(() => {
    const checkDb = async () => {
      try {
        const res = await fetch("/api/health");
        setDbStatus(res.ok ? "connected" : "disconnected");
      } catch (error) {
        console.error("Gagal memeriksa status database:", error);
        setDbStatus("error");
      }
    };

    checkDb();
    const interval = setInterval(checkDb, 30000);
    return () => clearInterval(interval);
  }, []);

  // --- 2. Logika Utama untuk Koneksi dan Lifecycle MQTT ---
  useEffect(() => {
    // Konfigurasi Klien MQTT
    const mqttHost = process.env.NEXT_PUBLIC_MQTT_HOST || "broker.hivemq.com";
    const mqttPort = parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || "9001", 10);
    // Secara otomatis gunakan SSL jika port adalah 9001 (standar untuk WSS)
    const useSSL = mqttPort === 9001;
    const clientId = `dashboard_${Math.random().toString(16).substring(2, 8)}`;

    // Inisialisasi klien HANYA SEKALI menggunakan ref
    if (!clientRef.current) {
      const client = new Paho.Client(mqttHost, mqttPort, clientId);
      clientRef.current = client;

      // --- Pengaturan Handler Event Klien ---
      client.onConnectionLost = (responseObject) => {
        if (responseObject.errorCode !== 0) {
          console.error("Koneksi MQTT terputus:", responseObject.errorMessage);
          setMqttStatus("disconnected");
          // Opsi `reconnect: true` di bawah akan menangani upaya koneksi ulang secara otomatis
        }
      };

      client.onMessageArrived = (message) => {
        console.log(`Pesan diterima di topic '${message.destinationName}'`);
        setPayloads((prevPayloads) => ({
          ...prevPayloads,
          [message.destinationName]: message.payloadString,
        }));
      };

      // --- Fungsi Callback Koneksi ---
      const onConnect = () => {
        console.log("✅ Berhasil terhubung ke MQTT Broker.");
        setMqttStatus("connected");
      };

      const onFailure = (responseObject: { errorMessage: string }) => {
        console.error("Gagal terhubung ke MQTT:", responseObject.errorMessage);
        setMqttStatus("error");
      };

      // --- Mulai Proses Koneksi ---
      console.log(`🔌 Menghubungkan ke MQTT di ${mqttHost}:${mqttPort}...`);
      setMqttStatus("connecting");
      client.connect({
        onSuccess: onConnect,
        onFailure: onFailure,
        useSSL: useSSL,
        userName: process.env.NEXT_PUBLIC_MQTT_USERNAME,
        password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
        reconnect: true, // Biarkan library Paho menangani reconnect
        cleanSession: true,
      });
    }

    // --- Fungsi Cleanup ---
    // Dipanggil saat komponen di-unmount untuk mencegah memory leak
    return () => {
      const client = clientRef.current;
      if (client && client.isConnected()) {
        console.log("🛑 Memutuskan koneksi MQTT...");
        client.disconnect();
      }
    };
  }, []); // <-- Dependency array kosong, memastikan efek ini hanya berjalan sekali

  // --- 3. Logika untuk Subscribe ke Topic ---
  useEffect(() => {
    const client = clientRef.current;
    // Lakukan subscribe hanya jika klien sudah ada dan statusnya "connected"
    if (client && mqttStatus === "connected" && topicsToSubscribe.length > 0) {
      console.log("🔄 Melakukan subscribe ke topics:", topicsToSubscribe);
      for (const topic of topicsToSubscribe) {
        client.subscribe(topic, {
          onSuccess: () =>
            console.log(`   ✅ Berhasil subscribe ke [${topic}]`),
          onFailure: (err) =>
            console.error(`   ❌ Gagal subscribe ke [${topic}]`, err),
        });
      }
      // Note: Untuk unsubscribe dari topic lama, diperlukan logika tambahan
      // untuk membandingkan `topicsToSubscribe` dengan state sebelumnya.
    }
  }, [topicsToSubscribe, mqttStatus]); // <-- Jalankan ulang jika daftar topic atau status koneksi berubah

  return { dbStatus, mqttStatus, payloads };
}
