"use client";

import { useState, useEffect } from "react";
import Paho from "paho-mqtt";

// Definisikan tipe data untuk status koneksi
type Status = "connected" | "disconnected" | "connecting";

export function useConnectivity() {
  const [dbStatus, setDbStatus] = useState<Status>("connecting");
  const [mqttStatus, setMqttStatus] = useState<Status>("connecting");
  // State baru untuk menampung payloads
  const [payloads, setPayloads] = useState<Record<string, string>>({});

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

  useEffect(() => {
    const mqttHost = process.env.NEXT_PUBLIC_MQTT_HOST || "broker.hivemq.com";
    const mqttPort = parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || "9001");
    const clientId = "modbo_dashboard_" + new Date().getTime();

    const client = new Paho.Client(mqttHost, mqttPort, clientId);

    client.onConnectionLost = (responseObject) => {
      /* ... */
    };

    // Saat pesan masuk, update state payloads
    client.onMessageArrived = (message) => {
      setPayloads((prevPayloads) => ({
        ...prevPayloads,
        [message.destinationName]: message.payloadString,
      }));
    };

    const onConnect = () => {
      console.log("Berhasil terhubung ke MQTT Broker.");
      setMqttStatus("connected");
      // Subscribe ke semua topic yang diberikan
      if (topicsToSubscribe.length > 0) {
        console.log("Subscribing to topics:", topicsToSubscribe);
        for (const topic of topicsToSubscribe) {
          client.subscribe(topic);
        }
      }
    };

    client.connect({
      onSuccess: onConnect,
      onFailure: () => setMqttStatus("disconnected"),
      useSSL: true,
      userName: process.env.NEXT_PUBLIC_MQTT_USERNAME,
      password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
      reconnect: true,
    });

    return () => {
      /* ... (disconnect logic) ... */
    };
  }, [topicsToSubscribe]); // Jalankan ulang jika daftar topic berubah

  // Kembalikan payloads bersama status
  return { dbStatus, mqttStatus, payloads };
}
