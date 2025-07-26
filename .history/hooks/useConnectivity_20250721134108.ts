// File: hooks/useConnectivity.ts
"use client";

import { useState, useEffect } from "react";
import { useMqtt } from "@/contexts/MqttContext"; // Menggunakan Context baru

type Status = "connected" | "disconnected" | "connecting";

export function useConnectivity(topicsToSubscribe: string[]) {
  const { connectionStatus: mqttStatus, subscribe, unsubscribe } = useMqtt();
  const [dbStatus, setDbStatus] = useState<Status>("connecting");
  const [payloads, setPayloads] = useState<Record<string, string>>({});

  // Cek Database (tidak berubah)
  useEffect(() => {
    const checkDb = async () => {
      /* ... logika cek DB sama ... */
    };
    checkDb();
    const interval = setInterval(checkDb, 30000);
    return () => clearInterval(interval);
  }, []);

  // Logika subscribe MQTT yang baru dan aman
  useEffect(() => {
    const handleMessage: (topic: string, payload: string) => void = (
      topic,
      payload
    ) => {
      if (topicsToSubscribe.includes(topic)) {
        setPayloads((prev) => ({ ...prev, [topic]: payload }));
      }
    };

    // Daftarkan listener untuk setiap topic
    topicsToSubscribe.forEach((topic) => subscribe(topic, handleMessage));

    // Cleanup: batalkan pendaftaran saat komponen unmount atau daftar topic berubah
    return () => {
      topicsToSubscribe.forEach((topic) => unsubscribe(topic, handleMessage));
    };
  }, [topicsToSubscribe, subscribe, unsubscribe]);

  return { dbStatus, mqttStatus, payloads };
}
