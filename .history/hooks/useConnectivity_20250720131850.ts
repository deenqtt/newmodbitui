"use client";

import { useState, useEffect } from "react";
import Paho from "paho-mqtt";

type Status = "connected" | "disconnected" | "connecting";

// Hook sekarang menerima array of topics
export function useConnectivity(topicsToSubscribe: string[]) {
  const [dbStatus, setDbStatus] = useState<Status>("connecting");
  const [mqttStatus, setMqttStatus] = useState<Status>("connecting");
  // State baru untuk menampung payloads
  const [payloads, setPayloads] = useState<Record<string, string>>({});

  // ... (useEffect untuk database tidak berubah)

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
