// File: hooks/useConnectivity.ts
"use client";

import { useState, useEffect } from "react";
import Paho from "paho-mqtt";

// ... (type Status = ...)

export function useConnectivity() {
  const [dbStatus, setDbStatus] = useState<Status>("connecting");
  const [mqttStatus, setMqttStatus] = useState<Status>("connecting");

  // ... (useEffect untuk Database tidak berubah)

  // useEffect untuk MQTT sekarang membaca dari .env
  useEffect(() => {
    const mqttHost = process.env.NEXT_PUBLIC_MQTT_HOST || "broker.hivemq.com";
    const mqttPort = parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || "9001");
    const clientId = "modbo_dashboard_" + new Date().getTime();

    const client = new Paho.Client(mqttHost, mqttPort, clientId);

    client.onConnectionLost = (responseObject) => {
      // ...
    };
    client.onMessageArrived = (message) => {
      // ...
    };

    const connectMqtt = () => {
      setMqttStatus("connecting");
      client.connect({
        onSuccess: () => setMqttStatus("connected"),
        onFailure: () => setMqttStatus("disconnected"),
        useSSL: true, // Gunakan true jika port Anda (seperti 9001) menggunakan WSS (WebSocket Secure)
        userName: process.env.NEXT_PUBLIC_MQTT_USERNAME,
        password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
      });
    };

    connectMqtt();

    return () => {
      if (client.isConnected()) {
        client.disconnect();
      }
    };
  }, []);

  return { dbStatus, mqttStatus };
}
