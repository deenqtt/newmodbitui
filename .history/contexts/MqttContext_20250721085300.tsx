// File: contexts/MqttContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import Paho from "paho-mqtt";

interface MqttContextType {
  client: Paho.Client | null;
  connectionStatus: string;
}

const MqttContext = createContext<MqttContextType>({
  client: null,
  connectionStatus: "Disconnected",
});

export function useMqtt() {
  return useContext(MqttContext);
}

export function MqttProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<Paho.Client | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");

  useEffect(() => {
    const mqttHost = process.env.NEXT_PUBLIC_MQTT_HOST || "localhost";
    const mqttPort = parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || "9001");
    const clientId = `client-${Math.random()}`;

    const mqttClient = new Paho.Client(mqttHost, mqttPort, clientId);

    mqttClient.onConnectionLost = (responseObject) => {
      if (responseObject.errorCode !== 0) {
        setConnectionStatus("Disconnected");
        console.log("Connection lost:", responseObject.errorMessage);
      }
    };

    // onMessageArrived akan ditangani di masing-masing komponen tabel

    mqttClient.connect({
      onSuccess: () => {
        console.log("MQTT Connected!");
        setConnectionStatus("Connected");
        setClient(mqttClient);
      },
      onFailure: (error) => {
        setConnectionStatus("Failed to Connect");
        console.error("Connection failed:", error.errorMessage);
      },
      useSSL: false, // Sesuaikan jika perlu
      reconnect: true,
    });

    return () => {
      if (mqttClient.isConnected()) {
        mqttClient.disconnect();
      }
    };
  }, []);

  return (
    <MqttContext.Provider value={{ client, connectionStatus }}>
      {children}
    </MqttContext.Provider>
  );
}
